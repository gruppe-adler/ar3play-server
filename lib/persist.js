/// <reference path="./../typings/tsd.d.ts" />
var sf = require('sprintf');
var async = require('async');
var PlayerInfo = require('./PlayerInfo');
var redis = require('redis');
var redisClient = redis.createClient();
var currentMission = '';
var sprintf = sf.sprintf;
var liveStatus = {};
function updateLiveStatus(playerName, playerInfo) {
    liveStatus[playerName] = playerInfo.add(liveStatus[playerName] || null);
}
var dummyCallback = function (err, data) {
    if (err) {
        console.log(err);
    }
};
redisClient.select(2, dummyCallback);
function getTimestampNow() {
    return parseInt(((new Date()).getTime() / 1000).toFixed(0), 10);
}
function getMissionInstanceName(missionName, timestamp) {
    return sprintf('%s: %s ', (new Date()).setTime(timestamp * 1000), missionName);
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
function getPlayerKey(playerName, timestamp, cb) {
    getCurrentMission(function (err, missionName) {
        cb(err, sprintf('mission:%s:player:%s:ts:%d', missionName, playerName, timestamp));
    });
}
function getAllPlayers(missionName, cb) {
    redisClient.smembers(sprintf('mission:%s:players', missionName), cb);
}
function getIsStreamable(missionName, cb) {
    redisClient.hget(sprintf('mission:%s', missionName), 'is_streamable', function (err, data) {
        cb(err, data === '1');
    });
}
exports.getIsStreamable = getIsStreamable;
function getAllLivePlayerData() {
    return liveStatus;
}
exports.getAllLivePlayerData = getAllLivePlayerData;
function getAllPlayerData(missionName, timestamp, cb) {
    getAllPlayers(missionName, function (err, playerNames) {
        var getPlayerData = function (playerName, cb) {
            getPlayerKey(playerName, timestamp, function (err, playerKey) {
                redisClient.hgetall(playerKey, function (err, data) {
                    var player = new PlayerInfo.PlayerInfo(new PlayerInfo.Point(data.x, data.y), data.side, data.status);
                    cb(err, player);
                });
            });
        };
        async.map(playerNames, getPlayerData, function (err, playerData) {
            cb(err, playerData);
        });
    });
}
exports.getAllPlayerData = getAllPlayerData;
function init(_redis) {
    redisClient = _redis;
}
exports.init = init;
function missionEnd(cb) {
    var now = getTimestampNow();
    getCurrentMission(function (err, missionName) {
        redisClient.hset(sprintf('mission:%s', missionName), 'endtime', now);
        redisClient.set('currentMission', 'empty', dummyCallback);
        currentMission = 'empty';
    });
    cb && cb(null, 201);
}
exports.missionEnd = missionEnd;
function missionStart(missionname, worldname, cb) {
    var now = getTimestampNow();
    var currentMissionInstance = getMissionInstanceName(missionname, now);
    missionEnd(function () {
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
    var now = getTimestampNow();
    getCurrentMission(function (err, missionName) {
        redisClient.hmset(sprintf('mission:%s', missionName), {
            is_streamable: isStreamable ? '1' : '0'
        }, dummyCallback);
    });
    cb && cb(null, 201);
}
exports.setIsStreamable = setIsStreamable;
function setPlayerPosition(playerName, position, cb) {
    getPlayerKey(playerName, getTimestampNow(), function (error, playerKey) {
        redisClient.hset(playerKey, 'x', position.x, dummyCallback);
        redisClient.hset(playerKey, 'y', position.y, dummyCallback);
    });
    updateLiveStatus(playerName, new PlayerInfo.PlayerInfo(position));
    cb && cb(null, 201);
}
exports.setPlayerPosition = setPlayerPosition;
function setPlayerData(playerName, player, cb) {
    var now = getTimestampNow();
    getPlayerKey(playerName, now, function (error, playerKey) {
        redisClient.hmset(playerKey, { x: player.position.x, y: player.position.y, side: player.side, status: player.status }, dummyCallback);
    });
    updateLiveStatus(playerName, player);
    cb && cb(null, 201);
}
exports.setPlayerData = setPlayerData;
function setPlayerStatus(playerName, status, cb) {
    getPlayerKey(playerName, getTimestampNow(), function (playerKey) {
        redisClient.hset(playerKey, 'status', status, dummyCallback);
    });
    var playerInfo = new PlayerInfo.PlayerInfo();
    playerInfo.status = status;
    updateLiveStatus(playerName, playerInfo);
    cb && cb(null, 201);
}
exports.setPlayerStatus = setPlayerStatus;
function setPlayerSide(playerName, side, cb) {
    getPlayerKey(playerName, getTimestampNow(), function (playerKey) {
        try {
            redisClient.hset(playerKey, 'side', PlayerInfo.Side.fromGameSide(side), dummyCallback);
        }
        catch (e) {
            console.log('error setting player ' + playerName + ' side: ' + e.message);
        }
    });
    cb && cb(null, 201);
}
exports.setPlayerSide = setPlayerSide;
//# sourceMappingURL=persist.js.map