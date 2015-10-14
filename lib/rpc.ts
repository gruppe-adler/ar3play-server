/// <reference path="./../typings/tsd.d.ts" />

import _ = require('underscore');
import persist = require('./persist');
import arma = require('./arma');
import log = require('./log');

var
    rpc = require('sock-rpc'),
    logger = log.getLogger(__filename),
    HashMap = require('hashmap');


var verify = {
    str: function (variable: any, errorKey: string) {
        if (typeof variable !== 'string') {
            throw new Error('not a string: ' + errorKey);
        }
        return this;
    },
    arr: function (variable: any, errorKey: string) {
        if (!Array.isArray(variable)) {
            throw new Error('not an array: ' + errorKey);
        }
        return this;
    },
    fn: function (variable: any, errorKey: string) {
        if (typeof variable !== 'function') {
            throw new Error('not a function: ' + errorKey + ', but: ' + variable);
        }
        return this;
    }
};

(function (rpcLogger: any) {
    rpcLogger.severe = rpcLogger.error;
    rpcLogger.fine = rpcLogger.debug;
    rpcLogger.finer = rpcLogger.debug;
    rpcLogger.finest= rpcLogger.trace;
    rpc.setLogger(rpcLogger);
}(log.getLogger('sock-rpc')));

export function init(ports) {
    registerAll();

    if (!Array.isArray(ports)) {
        ports = [ports];
    }

    ports.forEach(function (port) {
        rpc.listen("::1", port);
        logger.info('listening for RPC calls on port ' + port);
    });
}

/* [
 *   [
 *     id: int,
 *     x: int,
 *     y: int,
 *     z: int,
 *     dir: int,
 *     side: string,
 *     health: string,
 *     icon: string,
 *     name: string,
 *     container: int,
 *     content: int[]
 *   ]
 * ]
 *
 *
 */
function setAllUnitData(allUnitData: Array<Array<any>>, callback: Function) {
    verify.arr(allUnitData, 'all units: array');
    var _that = this;
    allUnitData.forEach(function (datum) {
        setUnitDatum.call(_that, datum, function () {});
    });

    callback && callback(null, 201);
}

function setUnitDatum(unitData: Array<any>, callback: Function) {
    verify.arr(unitData, 'array');

    var model = arma.toUnit(unitData);
    this.saveUnitDatum(model);

    callback && callback(null, 201);
}

function missionStart(missionName: string, worldname: string, callback: Function) {
    verify.str(missionName, 'missionName').str(worldname, 'worldname');
    logger.info('mission started: ' + missionName);
    this.missionStart(missionName, worldname, function (error: Error, instanceId: string) {
        callback(error, instanceId);
    });
}

function getDate(callback: Function) {
    logger.debug('getDate called :)');
    callback(null, new Date().toString());
}

function missionEnd(callback: Function) {
    logger.info('mission end called.');
    this.missionEnd();
    callback(null, 201);
}

function setIsStreamable(isStreamable: boolean, cb: Function) {
    this.setIsStreamable(isStreamable);
    cb(null, 201);
}

function echo() {
    var args = Array.prototype.slice.call(arguments, 0);
    var callback = args.pop();

    logger.debug(args);

    callback(null, args);
}

function getClientId(callback: Function) {
    callback(null, this.getClientId());
}

function notImplemented() {
    var args = Array.prototype.slice.call(arguments, 0);
    var callback = args.pop();

    callback(new Error('not implemented'));
}

function getAsPersistenceMethod(fn: Function) {
    return function () {
        fn.apply(persist.getPersistence(this.socketId), arguments);
    };
}

function registerAll() {
    rpc.register('echo', getAsPersistenceMethod(echo));
    rpc.register('getDate', getAsPersistenceMethod(getDate));
    rpc.register('missionStart', getAsPersistenceMethod(missionStart));
    rpc.register('missionEnd', getAsPersistenceMethod(missionEnd));
    rpc.register('setIsStreamable', getAsPersistenceMethod(setIsStreamable));
    rpc.register('setPlayerPosition', notImplemented);
    rpc.register('setAllPlayerData', notImplemented);
    rpc.register('setPlayerData', notImplemented);
    rpc.register('setUnitDatum', getAsPersistenceMethod(setUnitDatum));
    rpc.register('setAllUnitData', getAsPersistenceMethod(setAllUnitData));
    rpc.register('getClientId', getAsPersistenceMethod(getClientId));
}
