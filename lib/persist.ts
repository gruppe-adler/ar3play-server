/// <reference path="./../typings/tsd.d.ts" />

import sf = require('sprintf');
import async = require('async');
import Mission = require('./Mission');
import redis = require('redis');
import log = require('./log');
import util = require('./util');
import _ = require('underscore');
import Configuration = require('./Configuration');
import Authentication = require('./Authentication');
import models = require('./models');

var HashMap = require('hashmap');
var redisClient: redis.RedisClient = redis.createClient(Configuration.Redis.port, Configuration.Redis.host);
var currentInstanceId: string = '';
var sprintf = sf.sprintf;
var logger = log.getLogger(__filename);

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

function getUnitSTRINGKey(instanceId: string, unitId: number, timestamp: number): string {
    return sprintf('mission:%s,unit:%d,ts:%d', encodeURIComponent(instanceId), unitId, timestamp);
}

function getUnitSTRINGKeyPattern(instanceId: string): string {
    return sprintf('mission:%s,unit*', encodeURIComponent(instanceId));
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

function getUnitDataAt(unitKey: string, cb: AsyncResultCallback<models.Unit>) {
    redisClient.get(unitKey, function (error: Error, playerData: string) {
        var unit;
        if (error) {
            logger.error(error);
            return cb(error, null);
        }
        if (!playerData) {
            logger.trace(sprintf('got no unit datum at %s', unitKey));
            return cb(null, null);
        }

        cb(error, models.Unit.fromJSON(playerData));
    });
}

function getAllUnits(instanceId: string, cb: Function) {
    redisClient.smembers(getPlayersSETKey(instanceId), function (err: Error, unitIds: string[]) {
        cb(err, unitIds.map(util.toInt));
    });
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
    cb: AsyncResultCallback<HashMap<string, models.Unit>>
) {
    getAllUnits(instanceId, function (err: Error, unitIds: number[]) {
        var getPlayerData = function (unitId: number, cb: AsyncResultCallback<models.Unit>) {
            var
                currentTimestamp: number = to,
                getThisUnitKey: Function = _.partial(getUnitSTRINGKey, instanceId, unitId),
                resultUnit: models.Unit = null,
                unitDataCallback = function (err: Error, unit: models.Unit) {
                    if (unit) {
                        if (!resultUnit) {
                            resultUnit = unit;
                        } else {
                            unit.augment(resultUnit);
                        }
                    }
                    if ((currentTimestamp <= from) || (resultUnit && resultUnit.isComplete())) {
                        logger.debug(sprintf('got result after %d iterations instead of %d', to - currentTimestamp, to - from));
                        return cb(null, resultUnit);
                    }
                    if (!resultUnit && (to - currentTimestamp) > 5) {
                        // assume we wont get data from that unit, period
                        return cb(null, null);
                    }

                    getter();
                },
                getter = function () {
                    currentTimestamp -= 1;
                    getUnitDataAt(getThisUnitKey(currentTimestamp), unitDataCallback);
                };

            getter();
        };

        async.map(unitIds, getPlayerData, function (err: Error, playerData: Array<models.Unit>) {
            var result = new HashMap();

            unitIds.forEach(function (unitId: number, idx: number) {
                result.set(unitId, playerData[idx]);
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


export function deleteMissionInstance(instanceId: string, cb?: ErrorCallback) {
    if (currentInstanceId === instanceId) {
        return cb && cb(new Error('cannot delete currently running mission instance!'));
    }

    async.waterfall([
        function (cb: Function) {
            redisClient.keys(getUnitSTRINGKeyPattern(instanceId), function (err: Error, keys: Array<string>) {
                cb(err, keys);
            });
        },
        function (keys: Array<string>, cb: Function) {
            if (!keys.length) {
                return cb();
            }

            redisClient.del(keys, function (err: Error, count: number) {
                logger.debug(sprintf('deleted %d player updates from mission %s', count || 0, instanceId));
                cb(err);
            });
        },
        function (cb: Function) {
            redisClient.del(getPlayersSETKey(instanceId), function (err: Error, count: number) {
                logger.debug(sprintf('deleted %d players set from mission %s', count, instanceId));
                cb(err);
            });
        },
        function (cb: Function) {
            redisClient.del(getMissionHASHKey(instanceId), function (err: Error, count: number) {
                logger.debug(sprintf('deleted %d mission instance %s details', count, instanceId));
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

export function saveUnitDatum(unit: models.Unit, cb?: AsyncResultCallback<any>) {
    var now = getTimestampNow();
    getUnitKeyLive(unit, now, function (error: Error, unitKey: string) {
        redisClient.set(unitKey, JSON.stringify(unit.toJSON()), dummyCallback);
    });
    cb && cb(null, 201);
}

function getUnitKeyLive(unit: models.Unit, timestamp: number, cb: AsyncResultCallback<string>) {
    getCurrentMission(function (err: Error, instanceId: string) {
        redisClient.sadd(getPlayersSETKey(instanceId), unit.id, dummyCallback);
        var playerKey = getUnitSTRINGKey(instanceId, unit.id, timestamp);
        cb(err, playerKey);
    });
}
