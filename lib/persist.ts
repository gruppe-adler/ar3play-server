/// <reference path="./../typings/tsd.d.ts" />

import sf = require('sprintf');
import async = require('async');
import PlayerInfo = require('./PlayerInfo');
import redis = require('redis');

var redisClient: redis.RedisClient = redis.createClient();
var currentMission: string = '';
var sprintf = sf.sprintf;

var liveStatus: Object = {
    //playerName: PlayerInfo,
    // ...
};

function updateLiveStatus(playerName: string, playerInfo: PlayerInfo.PlayerInfo) {
    liveStatus[playerName] = playerInfo.add(liveStatus[playerName] || null);
}

var dummyCallback = function (err: Error, data) {
    if (err) {
        console.log(err);
    }
};

redisClient.select(2, dummyCallback);

function getTimestampNow(): number {
    return parseInt(((new Date()).getTime() / 1000).toFixed(0), 10);
}

function getMissionInstanceName(missionName: string, timestamp: number): string {
    return sprintf('%s: %s ', (new Date()).setTime(timestamp * 1000), missionName);
}


export function getCurrentMission(cb: AsyncResultCallback<string>) {
    if (currentMission) {
        cb(null, currentMission);
    }
    redisClient.get('currentMission', function (err: Error, missionName: string) {
       cb(err, missionName || 'empty');
    });
}

function getPlayerKey(playerName: string, timestamp: number, cb: AsyncResultCallback<string>) {
    getCurrentMission(function (err: Error, missionName: string) {
        cb(err, sprintf('mission:%s:player:%s:ts:%d', missionName, playerName, timestamp));
    });
}

function getAllPlayers(missionName: string, cb: Function) {
    redisClient.smembers(sprintf('mission:%s:players', missionName), cb);
}

export function getIsStreamable(missionName: string, cb: AsyncResultCallback<boolean>) {
    redisClient.hget(sprintf('mission:%s', missionName), 'is_streamable', function (err: Error, data) {
        cb(err, data === '1');
    });
}

export function getAllLivePlayerData() {
    return liveStatus;
}

export function getAllPlayerData(missionName: string, timestamp: number, cb: AsyncResultCallback<Array<PlayerInfo.PlayerInfo>>) {

    getAllPlayers(missionName, function (err: Error, playerNames: string[]) {
        var getPlayerData = function (playerName: string, cb: Function) {
            getPlayerKey(playerName, timestamp, function (err, playerKey: string) {
                redisClient.hgetall(playerKey, function (err: Error, data) {
                    var player = new PlayerInfo.PlayerInfo(new PlayerInfo.Point(data.x, data.y), data.side, data.status);
                    cb(err, player);
                });

            });
        };
        async.map(playerNames, getPlayerData, function (err: Error, playerData: Array<PlayerInfo.PlayerInfo>) {
            cb(err, playerData);
        });
    });
}


export function init(_redis: redis.RedisClient) {
    redisClient = _redis;
}

export function missionEnd(cb?: AsyncResultCallback<any>) {
    var now = getTimestampNow();
    getCurrentMission(function (err: Error, missionName: string) {
        redisClient.hset(sprintf('mission:%s', missionName), 'endtime', now);
        redisClient.set('currentMission', 'empty', dummyCallback);
        currentMission = 'empty';
    });

    cb && cb(null, 201);
}

export function missionStart(missionname: string, worldname: string, cb?: AsyncResultCallback<any>) {
    var now = getTimestampNow();
    var currentMissionInstance = getMissionInstanceName(missionname, now);

    missionEnd(function () {
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
    var now = getTimestampNow();
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
    getPlayerKey(playerName, getTimestampNow(), function (error: Error, playerKey: string) {
        redisClient.hset(playerKey, 'x', position.x, dummyCallback);
        redisClient.hset(playerKey, 'y', position.y, dummyCallback);
    });
    updateLiveStatus(playerName, new PlayerInfo.PlayerInfo(position));

    cb && cb(null, 201);
}

export function setPlayerData(playerName: string, player: PlayerInfo.PlayerInfo, cb?: AsyncResultCallback<any>) {
    var now = getTimestampNow();
    getPlayerKey(playerName, now, function (error: Error, playerKey: string) {
        redisClient.hmset(playerKey, {x: player.position.x, y: player.position.y, side: player.side, status: player.status}, dummyCallback);
    });
    updateLiveStatus(playerName, player);
    cb && cb(null, 201);
}

export function setPlayerStatus(playerName: string, status: string, cb?: AsyncResultCallback<any>) {
    getPlayerKey(playerName, getTimestampNow(), function (playerKey) {
        redisClient.hset(playerKey, 'status', status, dummyCallback);
    });
    var playerInfo = new PlayerInfo.PlayerInfo();
    playerInfo.status = status;
    updateLiveStatus(playerName, playerInfo);
    cb && cb(null, 201);
}

export function setPlayerSide(playerName: string, side: string, cb?: AsyncResultCallback<any>) {
    getPlayerKey(playerName, getTimestampNow(), function (playerKey) {
        redisClient.hset(playerKey, 'side', PlayerInfo.Side.fromGameSide(side), dummyCallback);
    });
    cb && cb(null, 201);
}
