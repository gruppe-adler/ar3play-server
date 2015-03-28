/// <reference path="./../typings/tsd.d.ts" />

import sf = require('sprintf');
import async = require('async');
import PlayerInfo = require('./PlayerInfo');
import Mission = require('./Mission');
import redis = require('redis');
import bunyan = require('bunyan');
import _ = require('underscore');
import Configuration = require('./Configuration');
import Authentication = require('./Authentication');

var HashMap = require('hashmap');
var redisClient: redis.RedisClient = redis.createClient(Configuration.Redis.port, Configuration.Redis.host);
var currentInstanceId: string = '';
var sprintf = sf.sprintf;
var logger = bunyan.createLogger({name: __filename.split('/').pop()});

logger.level(Configuration.logLevel);

var dummyCallback = function (err: Error, data?: any) {
    if (err) {
        logger.error(err);
        logger.debug(data);
    }
};

redisClient.select(Configuration.Redis.db, function (err: Error) {
    if (err) {
        throw err;
    }
    logger.info('connected to Redis on ' + Configuration.Redis.host + ':' + Configuration.Redis.port + ', db ' + Configuration.Redis.db);
});

function getTimestampNow(): number {
    return parseInt(((new Date()).getTime() / 1000).toFixed(0), 10);
}

function createMissionInstanceId(): string {
    return sprintf('%s', (new Date()).getTime());
}

export function getCurrentMission(cb: AsyncResultCallback<string>) {
    if (currentInstanceId) {
        return cb(null, currentInstanceId);
    }

    redisClient.get(getCurrentMissionSTRINGKey(), function (err: Error, missionName: string) {
       cb(err, missionName || 'empty');
    });
}

function getPlayerHASHKey(instanceId: string, playerName: string, timestamp: number): string {
    return sprintf('mission:%s,player:%s,ts:%d', encodeURIComponent(instanceId), encodeURIComponent(playerName), timestamp);
}

function getPlayerHashKeyPattern(instanceId: string): string {
    return sprintf('mission:%s,player:*', encodeURIComponent(instanceId));
}

function getPlayersSETKey(instanceId: string) {
    return sprintf('mission:%s,players', encodeURIComponent(instanceId));
}
function getMissionHASHKey(instanceId: string): string {
    return sprintf('mission:%s,mission', encodeURIComponent(instanceId));
}

function getAllMissionsZSETKey(): string {
    return 'missions';
}

function getCurrentMissionSTRINGKey(): string {
    return 'currentInstanceId';
}

function getPlayerKeyLive(playerName: string, timestamp: number, cb: AsyncResultCallback<string>) {
    getCurrentMission(function (err: Error, instanceId: string) {
        redisClient.sadd(getPlayersSETKey(instanceId), encodeURIComponent(playerName), dummyCallback);
        var playerKey = getPlayerHASHKey(instanceId, encodeURIComponent(playerName), timestamp);
        cb(err, playerKey);
    });
}

function getPlayerDataAt(playerKey, cb: AsyncResultCallback<PlayerInfo.PlayerInfo>) {
    redisClient.hgetall(playerKey, function (error: Error, playerData: any) {
        var playerInfo: PlayerInfo.PlayerInfo;
        if (error) {
            logger.error(error);
            return cb(error, null);
        }
        if (playerData) {
            playerInfo = new PlayerInfo.PlayerInfo();
            if (playerData.x) {
                playerInfo.position = new PlayerInfo.Position(
                    parseInt(playerData.x, 10),
                    parseInt(playerData.y, 10),
                    parseInt(playerData.z, 10),
                    parseInt(playerData.dir, 10)
                );
            }
            if (playerData.condition || playerData.vehicle) {
                playerInfo.status = new PlayerInfo.Status(playerData.condition, playerData.vehicle);
            }
            if (playerData.classtype || playerData.side) {
                playerInfo.role = new PlayerInfo.Role(playerData.side, playerData.classtype);
            }
            logger.debug('got playerdata, x: ' + playerData.x);
        } else {
            logger.debug('got no playerdata');
        }

        cb(error, playerInfo);
    });
}

function getAllPlayers(instanceId: string, cb: Function) {
    redisClient.smembers(getPlayersSETKey(instanceId), cb);
}

export function getIsStreamable(cb: AsyncResultCallback<boolean>) {
    getCurrentMission(function (err: Error, instanceId: string) {
        if (err) {
            cb(err, false);
            return;
        }
        redisClient.hget(getMissionHASHKey(instanceId), 'is_streamable', function (err: Error, data: string) {
            cb(err, data === '1');
        });
    });
}

export function getAllMissions(cb: AsyncResultCallback<Array<Mission.MissionInfo>>) {
    redisClient.zrevrange(getAllMissionsZSETKey(), 0, 1000, function (error: Error, instanceIds: Array<string>) {
        async.map(instanceIds, getMissionDetails, cb);
    });
}

export function getMissionChanges(
    instanceId: string,
    from: number,
    to: number,
    cb: AsyncResultCallback<HashMap<string, PlayerInfo.PlayerInfo>>
) {
    getAllPlayers(instanceId, function (err: Error, playerNames: string[]) {
        var getPlayerData = function (playerName: string, cb: AsyncResultCallback<PlayerInfo.PlayerInfo>) {
            var
                cnt,
                timestamps: Array<number> = [],
                getter: AsyncResultIterator<number, PlayerInfo.PlayerInfo> = function (
                    timestamp: number,
                    cb: AsyncResultCallback<PlayerInfo.PlayerInfo>
                ) {
                    getPlayerDataAt(getPlayerHASHKey(instanceId, playerName, timestamp), cb);
                };

            // this may seem stupid, but there seems to be a bug where this:
            // (new Array(to - from)).map(function () {return cnt++});
            // will not return a different array
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

export function getMissionDetails(instanceId: string, cb: AsyncResultCallback<Object>) {
    redisClient.hgetall(getMissionHASHKey(instanceId), function (error: Error, data: any) {
        var missionInfo;
        if (data) {
            missionInfo = new Mission.MissionInfo(
                instanceId,
                data.name,
                data.worldname,
                parseInt(data.starttime, 10)
            );

            missionInfo.is_streamable = data.is_streamable === '1';
            if (data.endtime) {
                missionInfo.endtime = parseInt(data.endtime, 10);
            }
        }
        cb(error, missionInfo);
    });
}

export function init(_redis: redis.RedisClient) {
    redisClient = _redis;
}

export function missionEnd(cb?: AsyncResultCallback<any>) {
    getCurrentMission(function (err: Error, instanceId: string) {
        redisClient.hset(getMissionHASHKey(instanceId), 'endtime', getTimestampNow(), dummyCallback);
        currentInstanceId = 'empty';
        redisClient.set(getCurrentMissionSTRINGKey(), 'empty', function (err: Error) {
            cb && cb(err, 201);
        });
    });
}

export function missionStart(realMissionName: string, worldname: string, cb?: AsyncResultCallback<any>) {

    missionEnd(function () {
        var now = getTimestampNow();
        currentInstanceId = createMissionInstanceId();

        redisClient.set(getCurrentMissionSTRINGKey(), encodeURIComponent(currentInstanceId), dummyCallback);
        redisClient.zadd(getAllMissionsZSETKey(), now, encodeURIComponent(currentInstanceId), dummyCallback);
        redisClient.hmset(
            getMissionHASHKey(currentInstanceId),
            {
                name: realMissionName,
                worldname: worldname,
                starttime: now
            },
            dummyCallback
        );
        
        cb && cb(null, currentInstanceId);
    });
}

export function setIsStreamable(isStreamable: boolean, cb?: AsyncResultCallback<any>) {
    getCurrentMission(function (err: Error, missionName: string) {
        redisClient.hmset(
            getMissionHASHKey(missionName),
            {
                is_streamable: isStreamable ? '1' : '0'
            },
            dummyCallback
        );
    });

    cb && cb(null, 201);
}

export function setPlayerPosition(playerName, position: PlayerInfo.Position, cb?: AsyncResultCallback<any>) {
    setPlayerData(playerName, new PlayerInfo.PlayerInfo(position), cb);
}

export function setPlayerData(playerName: string, player: PlayerInfo.PlayerInfo, cb?: AsyncResultCallback<any>) {
    var now = getTimestampNow();
    getPlayerKeyLive(playerName, now, function (error: Error, playerKey: string) {
        var dataForRedis: any = {};
        if (player.position) {
            _.extend(dataForRedis, player.position.toJSON());
        }
        if (player.role) {
            _.extend(dataForRedis, player.role.toJSON());
        }
        if (player.status) {
            _.extend(dataForRedis, player.status.toJSON());
        }

        redisClient.hmset(playerKey, dataForRedis, dummyCallback);
    });
    cb && cb(null, 201);
}

export function deleteMissionInstance(instanceId: string, cb?: ErrorCallback) {
    if (currentInstanceId === instanceId) {
        return cb && cb(new Error('cannot delete currently running mission instance!'));
    }

    async.waterfall([
        function (cb: Function) {
            redisClient.keys(getPlayerHashKeyPattern(instanceId), function (err: Error, keys: Array<string>) {
                cb(err, keys);
            });
        },
        function (keys: Array<string>, cb: Function) {
            redisClient.del(keys, function (err: Error, count: number) {
                logger.debug(sprintf('deleted %d player updates from mission %s', count || 0, instanceId));
                cb(err);
            });
        },
        function (cb: Function) {
            redisClient.del(getPlayersSETKey(instanceId), function (err: Error, count: number) {
                logger.debug(sprintf('deleted players set from mission %s', instanceId));
                cb(err);
            });
        },
        function (cb: Function) {
            redisClient.del(getMissionHASHKey(instanceId), function (err: Error, count: number) {
                logger.debug(sprintf('deleted mission instance %s infos', instanceId));
                cb(err);
            });
        },
        function (cb: Function) {
            redisClient.zrem(getAllMissionsZSETKey(), encodeURIComponent(instanceId), function (err: Error) {
                logger.debug(sprintf('deleted mission instance %s from missions set', instanceId));
                cb(err);
            });
        }
    ], function (err: Error) {
        if (err) {
            logger.error(err);
            logger.error('could not complete deleting mission instance ' + instanceId);
        } else {
            logger.info(sprintf('mission instance %s deleted by user %s', instanceId, Authentication.getUser().name))
        }
        cb(err);
    });
}