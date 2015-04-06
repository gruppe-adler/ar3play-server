/// <reference path="./../typings/tsd.d.ts" />

import _ = require('underscore');
import persist = require('./persist');
import arma = require('./arma');
import log = require('./log');

var
    rpc = require('sock-rpc'),
    logger = log.getLogger(__filename);

var keepAlive = _.debounce(function () {
    logger.warn('timeout! declaring mission as ended');
    persist.missionEnd();
}, 45000);

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
    },
    keepAlive: function () {
        keepAlive();
        return this;
    }
};

export function init(port) {
    registerAll();

    rpc.listen("::1", port);
    logger.info('listening for RPC calls on port ' + port);
    keepAlive();
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
export function setAllUnitData(allUnitData: Array<Array<any>>, callback: Function) {
    verify.arr(allUnitData, 'all units: array');
    allUnitData.forEach(function (datum) {
        setUnitDatum(datum, function () {});
    });

    callback && callback(null, 201);
}

export function setUnitDatum(unitData: Array<any>, callback: Function) {
    verify.arr(unitData, 'array').keepAlive();

    var model = arma.toUnit(unitData);
    persist.saveUnitDatum(model);

    callback && callback(null, 201);
}

/**
 *
 * NOTE: callback is *not* called immediately here,
 *       because subsequent client requests will assume mission is already changed
 */
export function missionStart(missionName: string, worldname: string, callback: Function) {
    verify.str(missionName, 'missionName').str(worldname, 'worldname').keepAlive();
    logger.info('mission started: ' + missionName);
    persist.missionStart(missionName, worldname, function (error: Error) {
        callback(error, 200);
    });
}

export function getDate(callback: Function) {
    keepAlive();
    logger.debug('getDate called :)');
    callback(null, new Date().toString());
}

export function missionEnd(callback: Function) {
    logger.info('mission end called.');
    persist.missionEnd();
    callback(null, 201);
}

export function setIsStreamable(isStreamable: boolean, cb: Function) {
    keepAlive();
    persist.setIsStreamable(isStreamable);
    cb(null, 201);
}

export function echo() {
    keepAlive();
    var args = Array.prototype.slice.call(arguments, 0);
    var callback = args.pop();

    logger.debug(args);

    callback(null, args);
}

function notImplemented() {
    var args = Array.prototype.slice.call(arguments, 0);
    var callback = args.pop();

    callback(new Error('not implemented'));
}

function registerAll() {
    rpc.register('echo', echo);
    rpc.register('getDate', getDate);
    rpc.register('missionStart', missionStart);
    rpc.register('missionEnd', missionEnd);
    rpc.register('setIsStreamable', setIsStreamable);
    rpc.register('setPlayerPosition', notImplemented);
    rpc.register('setAllPlayerData', notImplemented);
    rpc.register('setPlayerData', notImplemented);
    rpc.register('setUnitDatum', setUnitDatum);
    rpc.register('setAllUnitData', setAllUnitData);
}
