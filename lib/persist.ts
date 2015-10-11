/// <reference path="./../typings/tsd.d.ts" />

import sf = require('sprintf');
import async = require('async');
import mission = require('./mission');
import redis = require('redis');
import log = require('./log');
import util = require('./util');
import _ = require('underscore');
import configuration = require('./configuration');
import authentication = require('./authentication');
import models = require('./models');
import redisKeys = require('./redisKeys');

interface UnitTimestampMap extends Dictionary<number> {
}
class UnitIdAndTimestamps {
    id:number;
    from:number;
    to:number;
}

var redisClient:redis.RedisClient = redis.createClient(configuration.Redis.port, configuration.Redis.host);
var HashMap = require('hashmap');
var sprintf = sf.sprintf;
var logger = log.getLogger(__filename);
var
    dummyCallback = function (err:Error, data?:any) {
        if (err) {
            logger.error(err);
            logger.debug(data);
        }
    };
var timeout = 90000;

var persistenceInstances: HashMap<string, Persistence> = new HashMap();

export function getPersistence(clientId: string): Persistence {
    var result = persistenceInstances.get(clientId);
    if (!result) {
        persistenceInstances.set(clientId, new Persistence(clientId));
    }
    return persistenceInstances.get(clientId);
}

export function clearPersistenceInstances() {
    persistenceInstances.clear();
}

redisClient.select(configuration.Redis.db, function (err:Error) {
        if (err) {
            throw err;
        }
        logger.info('connected to Redis on ' + configuration.Redis.host + ':' + configuration.Redis.port + ', db ' + configuration.Redis.db);
    }
);


export class Persistence {

    private currentInstanceId: string = '';

    private clientId: string;

    private doKeepAlive = _.debounce(function () {
        logger.warn('timeout! declaring mission as ended after getting no calls in ' + (timeout/1000) + ' seconds');
        this.missionEnd();
    }, timeout);


    constructor(clientId: string) {
        this.clientId = clientId;
    }

    keepAlive() {
        this.doKeepAlive();
    }

    getCurrentInstanceId(): string {
        return this.currentInstanceId;
    }

    getIsStreamable(cb:AsyncResultCallback<boolean>) {
        this.getCurrentMission(function (err:Error, instanceId:string) {
            if (err) {
                cb(err, false);
                return;
            }
            redisClient.hget(redisKeys.getMissionHASHKey(instanceId), 'is_streamable', function (err:Error, data:string) {
                cb(err, data === '1');
            });
        });
    }

    getClientId(): string {
        return this.clientId;
    }

    missionEnd(cb?:AsyncResultCallback<any>) {
        var _that = this;
        this.getCurrentMission(function (err:Error, instanceId:string) {
            if (!instanceId || (instanceId === 'empty')) {
                cb && cb(err, 201);
                return;
            }
            redisClient.hset(redisKeys.getMissionHASHKey(instanceId), 'endtime', getTimestampNow(), dummyCallback);
            _that.currentInstanceId = 'empty';
            redisClient.set(redisKeys.getCurrentMissionSTRINGKey(_that.clientId), 'empty', function (err:Error) {
                if (err) {
                    throw err;
                }
                addLastinfoInfo(instanceId, dummyCallback);
                cb && cb(err, 201);
            });
        });
    }

    missionStart(realMissionName:string, worldname:string, cb?:AsyncResultCallback<any>) {
        var _that = this;
        _that.keepAlive();
        _that.missionEnd(function (err, result) {
            var now = getTimestampNow();
            _that.currentInstanceId = createMissionInstanceId();

            redisClient.set(redisKeys.getCurrentMissionSTRINGKey(_that.clientId), encodeURIComponent(_that.currentInstanceId), dummyCallback);
            redisClient.zadd(redisKeys.getAllMissionsZSETKey(), now, encodeURIComponent(_that.currentInstanceId), dummyCallback);
            redisClient.hmset(
                redisKeys.getMissionHASHKey(_that.currentInstanceId),
                {
                    name: realMissionName,
                    worldname: worldname,
                    starttime: now
                },
                dummyCallback
            );

            cb && cb(null, _that.currentInstanceId);
        });
    }

    setIsStreamable(isStreamable:boolean, cb?:AsyncResultCallback<any>) {
        this.keepAlive();
        this.getCurrentMission(function (err:Error, instanceId:string) {
            redisClient.hmset(
                redisKeys.getMissionHASHKey(instanceId),
                {
                    is_streamable: isStreamable ? '1' : '0'
                },
                dummyCallback
            );
        });
        cb && cb(null, 201);
    }


    saveUnitDatum(unit:models.Unit, cb?:AsyncResultCallback<any>) {
        var now = getTimestampNow();
        this.keepAlive();
        this.getUnitKeyLive(unit, now, function (error:Error, unitKey:string) {
            redisClient.set(unitKey, JSON.stringify(unit.toJSON()), dummyCallback);
        });
        cb && cb(null, 201);
    }


    getUnitKeyLive(unit:models.Unit, timestamp:number, cb:AsyncResultCallback<string>) {
        this.getCurrentMission(function (err:Error, instanceId:string) {
            var statusRedisKey = unit.health === 'dead' ?
                redisKeys.getDeathsZSETKey(instanceId) :
                redisKeys.getCreationsZSETKey(instanceId);

            redisClient.zscore(statusRedisKey, unit.id, function (err:Error, result:number) {
                if (err) {
                    logger.error(err);
                    return;
                }
                if (!result) {
                    redisClient.zadd(statusRedisKey, timestamp, unit.id, dummyCallback);
                }
            });
            var playerKey = redisKeys.getUnitSTRINGKey(instanceId, unit.id, timestamp);
            cb(err, playerKey);
        });
    }

    getCurrentMission(cb: AsyncResultCallback<string>) {
        var _that = this;
        if (_that.currentInstanceId) {
            return cb(null, _that.currentInstanceId);
        }

        redisClient.get(redisKeys.getCurrentMissionSTRINGKey(_that.clientId), function (err:Error, missionName:string) {
            cb(err, missionName || 'empty');
        });
    }

}

export function addLastinfoInfo(instanceId:string, callback: AsyncResultCallback<string>) {
    async.parallel([
        function (cb:AsyncResultCallback<any>) {
            redisClient.zrange(redisKeys.getCreationsZSETKey(instanceId), 0, -1, cb);
        },
        function (cb:AsyncResultCallback<any>) {
            getMissionDetails(instanceId, cb);
        }
    ], function (err:Error, results:Array<any>) {
        if (err) {
            logger.error(err);
            callback(err, instanceId);
            return;
        }
        var
            unitIdsToCheckFor:Array<number> = results[0].map(util.toInt),
            missionDetails:mission.MissionInfo = results[1],
            currentTimestamp = missionDetails.endtime;

        logger.info('adding lastinfo info to mission ' + instanceId);
        logger.info(sprintf(
            'working down from %d to %d, for %d units',
            currentTimestamp,
            missionDetails.starttime,
            unitIdsToCheckFor.length
        ));


        async.doUntil(function (cb) {
            var unitIdsForCurrentTimestamp = unitIdsToCheckFor.map(function (unitId:number) {
                return function (cb:AsyncResultCallback<any>) {
                    getUnitDataAt(redisKeys.getUnitSTRINGKey(instanceId, unitId, currentTimestamp), function (error:Error, unitDatum:models.Unit) {
                        var unitIdsToCheckForIndex;
                        if (unitDatum) {

                            if (unitId === unitDatum.id) {
                                redisClient.zadd(redisKeys.getLastinfoZSETKey(instanceId), currentTimestamp, unitId, dummyCallback);
                                //remember: its nodejs, we dont have to worry about thread safety
                                unitIdsToCheckForIndex = unitIdsToCheckFor.indexOf(unitId);
                                if (unitIdsToCheckForIndex === -1) {
                                    logger.error(sprintf('couldnt find unit id %d in check array oO. this should not happen.', unitId));
                                } else {
                                    unitIdsToCheckFor.splice(unitIdsToCheckForIndex, 1);
                                }
                            } else {
                                logger.error(sprintf('unitDatum %s/%d%/%d contains b0rked data', instanceId, currentTimestamp, unitId));
                            }
                        }
                        cb(error, unitDatum ? 0 : unitId);
                    });
                };
            });
            async.parallel(unitIdsForCurrentTimestamp, function (error:Error, unitIdsNotFound:Array<number>) {

                unitIdsToCheckFor = unitIdsNotFound ? unitIdsNotFound.filter(util.identity) : [];
                currentTimestamp -= 1;
                cb(error);
            });
        }, function () {
            return currentTimestamp < missionDetails.starttime || unitIdsToCheckFor.length === 0;
        }, function (error:Error) {
            if (error) {
                logger.error(sprintf('adding lastinfo for mission %s failed!', instanceId));
                logger.error(error);
                callback(error, instanceId);
            } else {
                logger.info(sprintf('done adding lastinfo for mission %s', instanceId));
                callback(null, instanceId);
            }

        });
    });
}


export function deleteMissionInstance(instanceId:string, cb?:ErrorCallback) {
// TODO do the checks somewhere else (loop over Persistence instances…
//    if (this.currentInstanceId === instanceId) {
//        return cb && cb(new Error('cannot delete currently running mission instance!'));
//    }

    async.waterfall([
        function (cb:Function) {
            redisClient.keys(redisKeys.getUnitSTRINGKeyPattern(instanceId), function (err:Error, keys:Array<string>) {
                cb(err, keys);
            });
        },
        function (keys:Array<string>, cb:Function) {
            if (!keys.length) {
                return cb();
            }

            redisClient.del(keys, function (err:Error, count:number) {
                logger.debug(sprintf('deleted %d player updates from mission %s', count || 0, instanceId));
                cb(err);
            });
        },
        function (cb:Function) {
            redisClient.del(redisKeys.getCreationsZSETKey(instanceId), function (err:Error, count:number) {
                logger.debug(sprintf('deleted %d players create zset from mission %s', count, instanceId));
                cb(err);
            });
        },
        function (cb:Function) {
            redisClient.del(redisKeys.getDeathsZSETKey(instanceId), function (err:Error, count:number) {
                logger.debug(sprintf('deleted %d players create zset from mission %s', count, instanceId));
                cb(err);
            });
        },
        function (cb:Function) {
            redisClient.del(redisKeys.getLastinfoZSETKey(instanceId), function (err:Error, count:number) {
                logger.debug(sprintf('deleted %d players lastinfo zset from mission %s', count, instanceId));
                cb(err);
            });
        },
        function (cb:Function) {
            redisClient.del(redisKeys.getMissionHASHKey(instanceId), function (err:Error, count:number) {
                logger.debug(sprintf('deleted %d mission instance %s details', count, instanceId));
                cb(err);
            });
        },
        function (cb:Function) {
            redisClient.zrem(redisKeys.getAllMissionsZSETKey(), encodeURIComponent(instanceId), function (err:Error) {
                logger.debug(sprintf('deleted mission instance %s from missions set', instanceId));
                cb(err);
            });
        }
    ], function (err:Error) {
        if (err) {
            logger.error(err);
            logger.error('could not complete deleting mission instance ' + instanceId);
        } else {
            logger.info(sprintf('mission instance %s deleted.', instanceId))
        }
        cb(err);
    });
}

export function getMissionChanges(
    instanceId:string,
    from:number,
    to:number,
    cb:AsyncResultCallback<HashMap<string, models.Unit>>
) {
    async.parallel(
        [
            function (cb:AsyncResultCallback<UnitTimestampMap>) {
                getUnitStateChangesUpTo(redisKeys.getCreationsZSETKey(instanceId), to, cb);
            },
            function (cb:AsyncResultCallback<UnitTimestampMap>) {
                getUnitStateChangesUpTo(redisKeys.getLastinfoZSETKey(instanceId), to, cb);
            }
        ],
        function (error:Error, results:Array<UnitTimestampMap>) {
            var creates = results[0],
                deaths = results[1],
                unitIdsAndTimestamps:Array<UnitIdAndTimestamps>;

            unitIdsAndTimestamps = Object.keys(creates).filter(function (key:string):boolean {
                return (deaths[key] || Infinity) >= from;
            }).map(function (key:string):UnitIdAndTimestamps {
                var
                    deathTimestamp = deaths[key] || Infinity,
                    createTimestamp = creates[key] || 0,
                    unitIdAndTimestamps = new UnitIdAndTimestamps();

                unitIdAndTimestamps.id = parseInt(key, 10);
                unitIdAndTimestamps.from = Math.max(createTimestamp + 1, from);
                unitIdAndTimestamps.to = Math.min(deathTimestamp + 1, to);
                return unitIdAndTimestamps;
            });

            getUnitModels(instanceId, unitIdsAndTimestamps, cb)
        });
}


export function getUnitModels(instanceId:string,
    unitIds:Array<UnitIdAndTimestamps>,
    cb:AsyncResultCallback<HashMap<string, models.Unit>>
) {
    var getPlayerData = function (unitId:UnitIdAndTimestamps, cb:AsyncResultCallback<models.Unit>) {
        var
            currentTimestamp:number = unitId.to,
            getThisUnitKey:Function = _.partial(redisKeys.getUnitSTRINGKey, instanceId, unitId.id),
            resultUnit:models.Unit = null,
            unitDataCallback = function (err:Error, unit:models.Unit) {
                if (unit) {
                    if (!resultUnit) {
                        resultUnit = unit;
                    } else {
                        unit.augment(resultUnit);
                    }
                }
                if ((currentTimestamp <= unitId.from) || (resultUnit && resultUnit.isComplete())) {
                    /*
                     logger.debug(sprintf(
                     'got result after %d iterations',
                     unitId.to - currentTimestamp,
                     unitId.to - unitId.from
                     ));
                     */
                    return cb(null, resultUnit);
                }

                if (
                    configuration.assumeCompleteDataAllNSeconds && !resultUnit &&
                    ((unitId.to - currentTimestamp) > configuration.assumeCompleteDataAllNSeconds)
                ) {
                    /*
                     logger.debug(sprintf(
                     'did not get any data for %d (%d iterations, giving up after %d)',
                     unitId.id,
                     unitId.to - (currentTimestamp + 1),
                     configuration.assumeCompleteDataAllNSeconds
                     ));*/
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

    async.map(unitIds, getPlayerData, function (err:Error, playerData:Array<models.Unit>) {
        var result = new HashMap();

        playerData.forEach(function (playerDatum:models.Unit) {
            if (playerDatum) {
                result.set(playerDatum.id, playerDatum);
            }
        });

        cb(err, result);
    });

}

export function getMissionDetails(instanceId:string, cb:AsyncResultCallback<mission.MissionInfo>) {
    redisClient.hgetall(redisKeys.getMissionHASHKey(instanceId), function (error:Error, data:any) {
        var missionInfo;
        if (data) {
            missionInfo = new mission.MissionInfo(
                instanceId,
                data.name,
                data.worldname,
                parseInt(data.starttime, 10)
            );

            missionInfo.is_streamable = data.is_streamable === '1';
            if (data.endtime) {
                missionInfo.endtime = parseInt(data.endtime, 10);
            }
        } else if (!error) {
            error = new Error('no info found for mission ' + instanceId);
        }
        cb(error, missionInfo);
    });
}


export function getAllMissions(cb:AsyncResultCallback<Array<mission.MissionInfo>>) {
    redisClient.zrevrange(redisKeys.getAllMissionsZSETKey(), 0, -1, function (error:Error, instanceIds:Array<string>) {
        async.map(instanceIds, getMissionDetails, cb);
    });
}


export function getOldestMission(cb:AsyncResultCallback<mission.MissionInfo>) {
    redisClient.zrange(redisKeys.getAllMissionsZSETKey(), 0, 1, function (error:Error, instanceIds:Array<string>) {
        getMissionDetails(instanceIds.shift(), cb);
    });
}

export function getUnitStateChangesUpTo(redisKey:string, to:number, cb:AsyncResultCallback<UnitTimestampMap>) {
    redisClient.zrangebyscore(
        redisKey,
        0,
        to,
        'WITHSCORES',
        function (error:Error, results:Array<string>) { // returns array with value, score, value, score, ...
            var i;
            var unitIdToCreate:UnitTimestampMap = {};
            for (i = 0; i < results.length; i += 2) {
                unitIdToCreate[results[i]] = parseInt(results[i + 1], 10);
            }
            cb(error, unitIdToCreate);
        }
    );
}

function getTimestampNow():number {
    return parseInt(((new Date()).getTime() / 1000).toFixed(0), 10);
}

function createMissionInstanceId():string {
    return sprintf('%s', (new Date()).getTime());
}

function parseRedisInfo(redisInfo:string):Dictionary<string> {
    var result:Dictionary<string> = {};
    redisInfo.split('\n').forEach(function (line) {
        var lineBits = line.split(':', 2);
        if (lineBits.length < 2) {
            return;
        }
        result[lineBits[0].trim()] = lineBits[1].trim();
    });

    return result;
}

export function getUsedMemory(cb:AsyncResultCallback<number>) {
    redisClient.info(function (error:Error, redisInfo:string) {
        if (error) {
            throw error;
        }
        var redisInfoDict = parseRedisInfo(redisInfo);
        cb(error, parseInt(redisInfoDict["used_memory"], 10));
    });
}

export function getCurrentMission(cb:AsyncResultCallback<string>) {
    var key = persistenceInstances.keys().shift();
    if (!key) {
        return cb(null, 'empty');
    }

    cb(null, persistenceInstances.get(key).getCurrentInstanceId());
}


export function getCurrentMissions(cb:AsyncResultCallback<Array<string>>) {
    var instanceIds = persistenceInstances.values().map(function (p: Persistence) {
        return p.getCurrentInstanceId();
    });

    cb(null, instanceIds);
}

function getUnitDataAt(unitKey:string, cb:AsyncResultCallback<models.Unit>) {
    redisClient.get(unitKey, function (error:Error, playerData:string) {
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
