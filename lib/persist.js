/// <reference path="./../typings/tsd.d.ts" />
var sf = require('sprintf');
var async = require('async');
var PlayerInfo = require('./PlayerInfo');
var redis = require('redis');
var bunyan = require('bunyan');
var HashMap = require('hashmap');
var redisClient = redis.createClient();
var currentMission = '';
var sprintf = sf.sprintf;
var logger = bunyan.createLogger({ name: __filename.split('/').pop() });
var liveStatus = {};
logger.level("info");
function updateLiveStatus(playerName, playerInfo) {
    liveStatus[playerName] = playerInfo.augment(liveStatus[playerName] || null);
}
var dummyCallback = function (err, data) {
    if (err) {
        logger.error(err);
        logger.debug(data);
    }
};
redisClient.select(2, dummyCallback);
function getTimestampNow() {
    return parseInt(((new Date()).getTime() / 1000).toFixed(0), 10);
}
function createMissionInstanceName(missionName, timestamp) {
    return sprintf('%s:%s', timestamp, missionName.trim());
}
function getCurrentMission(cb) {
    if (currentMission) {
        cb(null, currentMission);
    }
    redisClient.get('currentMission', function (err, missionName) {
        cb(err, missionName || 'empty');
    });
}
exports.getCurrentMission = getCurrentMission;
function getPlayerKey(missionInstanceName, playerName, timestamp) {
    return sprintf('mission:%s,player:%s,ts:%d', missionInstanceName, playerName, timestamp);
}
function getPlayerKeyLive(playerName, timestamp, cb) {
    getCurrentMission(function (err, missionInstanceName) {
        redisClient.sadd(sprintf('mission:%s:players', missionInstanceName), playerName, dummyCallback);
        var playerKey = getPlayerKey(missionInstanceName, playerName, timestamp);
        cb(err, playerKey);
    });
}
function getPlayerDataAt(playerKey, cb) {
    redisClient.hgetall(playerKey, function (error, playerData) {
        var playerInfo;
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
        }
        else {
            logger.debug('got no playerdata');
        }
        cb(error, playerInfo);
    });
}
function getAllPlayers(missionInstanceName, cb) {
    redisClient.smembers(sprintf('mission:%s:players', missionInstanceName), cb);
}
function getIsStreamable(cb) {
    getCurrentMission(function (err, missionInstanceName) {
        if (err) {
            cb(err, false);
            return;
        }
        redisClient.hget(sprintf('mission:%s', missionInstanceName), 'is_streamable', function (err, data) {
            cb(err, data === '1');
        });
    });
}
exports.getIsStreamable = getIsStreamable;
function getAllLivePlayerData() {
    return liveStatus;
}
exports.getAllLivePlayerData = getAllLivePlayerData;
function getAllMissions(cb) {
    redisClient.zrevrange('missions', 0, 1000, cb);
}
exports.getAllMissions = getAllMissions;
function getMissionChanges(missionInstanceName, from, to, cb) {
    getAllPlayers(missionInstanceName, function (err, playerNames) {
        var getPlayerData = function (playerName, cb) {
            var cnt, timestamps = [], getter = function (timestamp, cb) {
                getPlayerDataAt(getPlayerKey(missionInstanceName, playerName, timestamp), cb);
            };
            for (cnt = from; cnt < to; cnt += 1) {
                timestamps.push(cnt);
            }
            async.map(timestamps, getter, function (error, results) {
                var reducedPlayerInfo = null;
                if (Array.isArray(results)) {
                    reducedPlayerInfo = results.reduce(function (prev, cur) {
                        if (!prev) {
                            return cur;
                        }
                        return prev.augment(cur);
                    }, null);
                }
                cb(error, reducedPlayerInfo);
            });
        };
        async.map(playerNames, getPlayerData, function (err, playerData) {
            var result = new HashMap();
            playerNames.forEach(function (playerName, idx) {
                result.set(playerName, playerData[idx]);
            });
            cb(err, result);
        });
    });
}
exports.getMissionChanges = getMissionChanges;
function getMissionDetails(missionInstanceName, cb) {
    redisClient.hgetall(sprintf('mission:%s', missionInstanceName), function (error, data) {
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
exports.getMissionDetails = getMissionDetails;
function init(_redis) {
    redisClient = _redis;
}
exports.init = init;
function missionEnd(cb) {
    var now = getTimestampNow();
    getCurrentMission(function (err, missionName) {
        redisClient.hset(sprintf('mission:%s', missionName), 'endtime', now, dummyCallback);
        currentMission = 'empty';
        redisClient.set('currentMission', 'empty', function (err) {
            cb && cb(err, 201);
        });
    });
}
exports.missionEnd = missionEnd;
function missionStart(missionname, worldname, cb) {
    var now = getTimestampNow();
    var currentMissionInstance = createMissionInstanceName(missionname, now);
    missionEnd(function () {
        currentMission = missionname;
        redisClient.set('currentMission', currentMissionInstance, dummyCallback);
        redisClient.zadd('missions', now, currentMissionInstance, dummyCallback);
        redisClient.hmset(sprintf('mission:%s', currentMissionInstance), {
            worldname: worldname,
            starttime: now
        }, dummyCallback);
    });
    cb && cb(null, 201);
}
exports.missionStart = missionStart;
function setIsStreamable(isStreamable, cb) {
    getCurrentMission(function (err, missionName) {
        redisClient.hmset(sprintf('mission:%s', missionName), {
            is_streamable: isStreamable ? '1' : '0'
        }, dummyCallback);
    });
    cb && cb(null, 201);
}
exports.setIsStreamable = setIsStreamable;
function setPlayerPosition(playerName, position, cb) {
    getPlayerKeyLive(playerName, getTimestampNow(), function (error, playerKey) {
        redisClient.hset(playerKey, 'x', position.x, dummyCallback);
        redisClient.hset(playerKey, 'y', position.y, dummyCallback);
    });
    updateLiveStatus(playerName, new PlayerInfo.PlayerInfo(position));
    cb && cb(null, 201);
}
exports.setPlayerPosition = setPlayerPosition;
function setPlayerData(playerName, player, cb) {
    var now = getTimestampNow();
    getPlayerKeyLive(playerName, now, function (error, playerKey) {
        var dataForRedis = {
            side: player.side,
            status: player.status
        };
        if (player.position) {
            dataForRedis.x = player.position.x;
            dataForRedis.y = player.position.y;
        }
        redisClient.hmset(playerKey, dataForRedis, dummyCallback);
    });
    updateLiveStatus(playerName, player);
    cb && cb(null, 201);
}
exports.setPlayerData = setPlayerData;
function setPlayerStatus(playerName, status, cb) {
    getPlayerKeyLive(playerName, getTimestampNow(), function (error, playerKey) {
        redisClient.hset(playerKey, 'status', status, dummyCallback);
    });
    var playerInfo = new PlayerInfo.PlayerInfo();
    playerInfo.status = status;
    updateLiveStatus(playerName, playerInfo);
    cb && cb(null, 201);
}
exports.setPlayerStatus = setPlayerStatus;
function setPlayerSide(playerName, side, cb) {
    getPlayerKeyLive(playerName, getTimestampNow(), function (error, playerKey) {
        try {
            redisClient.hset(playerKey, 'side', side, dummyCallback);
        }
        catch (e) {
            logger.error('error setting player ' + playerName + ' side: ' + e.message);
        }
    });
    cb && cb(null, 201);
}
exports.setPlayerSide = setPlayerSide;
//# sourceMappingURL=persist.js.map