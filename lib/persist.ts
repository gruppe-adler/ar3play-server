/// <reference path="./../typings/tsd.d.ts" />

import sf = require('sprintf');
import async = require('async');
import PlayerInfo = require('./PlayerInfo');
import redis = require('redis');
import bunyan = require('bunyan');

var HashMap = require('hashmap');
var redisClient: redis.RedisClient = redis.createClient();
var currentMission: string = '';
var sprintf = sf.sprintf;
var logger = bunyan.createLogger({name: __filename.split('/').pop()});


logger.level("info");

var dummyCallback = function (err: Error, data?: any) {
    if (err) {
        logger.error(err);
        logger.debug(data);
    }
};

redisClient.select(2, dummyCallback);

function getTimestampNow(): number {
    return parseInt(((new Date()).getTime() / 1000).toFixed(0), 10);
}

function createMissionInstanceName(missionName: string, timestamp: number): string {
    return sprintf('%s-%s', timestamp, missionName.trim());
}

export function getCurrentMission(cb: AsyncResultCallback<string>) {
    if (currentMission) {
        return cb(null, currentMission);
    }

    redisClient.get('currentMission', function (err: Error, missionName: string) {
       cb(err, missionName || 'empty');
    });
}

function getPlayerKey(missionInstanceName: string, playerName: string, timestamp: number): string {
    return sprintf('mission:%s,player:%s,ts:%d', missionInstanceName, playerName, timestamp);
}

function getPlayerKeyLive(playerName: string, timestamp: number, cb: AsyncResultCallback<string>) {
    getCurrentMission(function (err: Error, missionInstanceName: string) {
        redisClient.sadd(sprintf('mission:%s:players', missionInstanceName), playerName, dummyCallback);
        var playerKey = getPlayerKey(missionInstanceName, playerName, timestamp);
        cb(err, playerKey);
    });
}

function getPlayerDataAt(playerKey, cb: AsyncResultCallback<PlayerInfo.PlayerInfo>) {
    redisClient.hgetall(playerKey, function (error: Error, playerData: any) {
        var playerInfo: PlayerInfo.PlayerInfo;
        if (error) {
            logger.error(error);
            return cb(error, playerInfo);
        }
        if (playerData) {
            playerInfo = new PlayerInfo.PlayerInfo();
            if (playerData.x) {
                playerInfo.position = new PlayerInfo.Point(playerData.x, playerData.y);
            }
            playerInfo.side = playerData.side;
            playerInfo.status = playerData.status;

            logger.debug('got playerdata, x: ' + playerData.x);
        } else {
            logger.debug('got no playerdata');
        }


        cb(error, playerInfo);
    });
}

function getAllPlayers(missionInstanceName: string, cb: Function) {
    redisClient.smembers(sprintf('mission:%s:players', missionInstanceName), cb);
}

export function getIsStreamable(cb: AsyncResultCallback<boolean>) {
    getCurrentMission(function (err: Error, missionInstanceName: string) {
        if (err) {
            cb(err, false);
            return;
        }
        redisClient.hget(sprintf('mission:%s', missionInstanceName), 'is_streamable', function (err: Error, data: string) {
            cb(err, data === '1');
        });
    });
}

export function getAllMissions(cb: AsyncResultCallback<Array<string>>) {
    redisClient.zrevrange('missions', 0, 1000, cb);
}

export function getMissionChanges(
    missionInstanceName: string,
    from: number,
    to: number,
    cb: AsyncResultCallback<HashMap<string, PlayerInfo.PlayerInfo>>
) {
    getAllPlayers(missionInstanceName, function (err: Error, playerNames: string[]) {
        var getPlayerData = function (playerName: string, cb: AsyncResultCallback<PlayerInfo.PlayerInfo>) {
            var
                cnt,
                timestamps: Array<number> = [],
                getter: AsyncResultIterator<number, PlayerInfo.PlayerInfo> = function (
                    timestamp: number,
                    cb: AsyncResultCallback<PlayerInfo.PlayerInfo>
                ) {
                    getPlayerDataAt(getPlayerKey(missionInstanceName, playerName, timestamp), cb);
                };

            // this may seem stupid, but there seems to be a bug where this: (new Array(to - from)).map(function () {return cnt++});
            // will not change the array
            for (cnt = from; cnt < to; cnt += 1) {
                timestamps.push(cnt);
            }

            async.map(timestamps, getter, function (error: Error, results: Array<PlayerInfo.PlayerInfo>) {
                var reducedPlayerInfo: PlayerInfo.PlayerInfo = null;

                if (Array.isArray(results)) {
                    reducedPlayerInfo = results.reduce(function (prev: PlayerInfo.PlayerInfo, cur: PlayerInfo.PlayerInfo): PlayerInfo.PlayerInfo {
                        if (!prev) {
                            return cur;
                        }
                        return prev.augment(cur);
                    }, null);
                }

                cb(error, reducedPlayerInfo);
            });
        };

        async.map(playerNames, getPlayerData, function (err: Error, playerData: Array<PlayerInfo.PlayerInfo>) {
            var result = new HashMap();

            playerNames.forEach(function (playerName, idx) {
                result.set(playerName, playerData[idx]);
            });

            cb(err, result);
        });
    });
}

export function getMissionDetails(missionInstanceName: string, cb: AsyncResultCallback<Object>) {
    redisClient.hgetall(sprintf('mission:%s', missionInstanceName), function (error: Error, data: any) {
        if (data) {
            data.is_streamable = data.is_streamable === '1';

            if (data.starttime) {
                data.starttime = parseInt(data.starttime, 10);
            }

            if (data.endtime) {
                data.endtime = parseInt(data.endtime, 10);
            }
        }
        cb(error, data);
    });
}

export function init(_redis: redis.RedisClient) {
    redisClient = _redis;
}

export function missionEnd(cb?: AsyncResultCallback<any>) {
    var now = getTimestampNow();
    getCurrentMission(function (err: Error, missionName: string) {
        redisClient.hset(sprintf('mission:%s', missionName), 'endtime', now, dummyCallback);
        currentMission = 'empty';
        redisClient.set('currentMission', 'empty', function (err: Error) {
            cb && cb(err, 201);
        });
    });
}

export function missionStart(realMissionName: string, worldname: string, cb?: AsyncResultCallback<any>) {
    var now = getTimestampNow();
    var currentMissionInstance = createMissionInstanceName(realMissionName, now);

    missionEnd(function () {
        currentMission = currentMissionInstance;
        redisClient.set('currentMission', currentMissionInstance, dummyCallback);
        redisClient.zadd('missions', now, currentMissionInstance, dummyCallback);
        redisClient.hmset(
            sprintf('mission:%s', currentMissionInstance),
            {
                worldname: worldname,
                starttime: now
            },
            dummyCallback
        );
    });

    cb && cb(null, 201);
}

export function setIsStreamable(isStreamable: boolean, cb?: AsyncResultCallback<any>) {
    getCurrentMission(function (err: Error, missionName: string) {
        redisClient.hmset(
            sprintf('mission:%s', missionName),
            {
                is_streamable: isStreamable ? '1' : '0'
            },
            dummyCallback
        );
    });

    cb && cb(null, 201);
}


export function setPlayerPosition(playerName, position: PlayerInfo.Point, cb?: AsyncResultCallback<any>) {
    getPlayerKeyLive(playerName, getTimestampNow(), function (error: Error, playerKey: string) {
        redisClient.hset(playerKey, 'x', position.x, dummyCallback);
        redisClient.hset(playerKey, 'y', position.y, dummyCallback);
    });

    cb && cb(null, 201);
}

export function setPlayerData(playerName: string, player: PlayerInfo.PlayerInfo, cb?: AsyncResultCallback<any>) {
    var now = getTimestampNow();
    getPlayerKeyLive(playerName, now, function (error: Error, playerKey: string) {
        var dataForRedis: any = {
            side: player.side,
            status: player.status
        };
        if (player.position) {
            dataForRedis.x = player.position.x;
            dataForRedis.y = player.position.y;
        }
        redisClient.hmset(playerKey, dataForRedis, dummyCallback);
    });
    cb && cb(null, 201);
}

export function setPlayerStatus(playerName: string, status: string, cb?: AsyncResultCallback<any>) {
    getPlayerKeyLive(playerName, getTimestampNow(), function (error: Error, playerKey: string) {
        redisClient.hset(playerKey, 'status', status, dummyCallback);
    });
    var playerInfo = new PlayerInfo.PlayerInfo();
    playerInfo.status = status;
    cb && cb(null, 201);
}

export function setPlayerSide(playerName: string, side: string, cb?: AsyncResultCallback<any>) {
    getPlayerKeyLive(playerName, getTimestampNow(), function (error: Error, playerKey: string) {
        try {
            redisClient.hset(playerKey, 'side', side, dummyCallback);
        } catch (e) {
            logger.error('error setting player ' + playerName + ' side: ' + e.message);
        }
    });
    cb && cb(null, 201);
}
