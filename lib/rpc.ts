/// <reference path="./../typings/tsd.d.ts" />

import _ = require('underscore');
import persist = require('./persist');
import PlayerInfo = require('./PlayerInfo');
import bunyan = require('bunyan');

var
    rpc = require('sock-rpc'),
    logger = bunyan.createLogger({name: __filename.split('/').pop()});

logger.level('info');

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

function armaToPlayerPosition(position: Array<number>): PlayerInfo.Position {
    return new PlayerInfo.Position(
        parseInt(position[0].toFixed(0), 10),
        parseInt(position[1].toFixed(0), 10),
        parseInt(position[2].toFixed(0), 10),
        parseInt(position[3].toFixed(0), 10)
    );
}

function armaToPlayerRole(role: Array<string>): PlayerInfo.Role {
    var
        icon = role[1],
        side = role[0];

    if (icon) {
        icon = PlayerInfo.iconToShort(icon);
        if (!icon) {
            logger.warn('unknown infantry icon ' + role[1]);
            icon = null;
        }
    }
    return new PlayerInfo.Role(side ? PlayerInfo.Side.fromGameSide(side) : null, icon);
}

function armaToPlayerStatus(status: Array<string>): PlayerInfo.Status {
    var
        condition = status[0],
        vehicle = status[1];

    if (vehicle && PlayerInfo.Vehicle.values.indexOf(vehicle) === -1) {
        logger.warn('ignoring unknown vehicle type ' + vehicle);
        vehicle = null;
    }
    if (condition && PlayerInfo.Condition.values.indexOf(condition) === -1) {
        logger.warn('ignoring unknown condition ' + condition);
        condition = null;
    }
    return new PlayerInfo.Status(condition, vehicle);
}

function doSetPlayerPosition(name: string, position: Array<number>) {
    persist.setPlayerPosition(
        name,
        armaToPlayerPosition(position)
    );
}

/**
 *  [
 *    [ name, position: [x, y, z, dir], role: [side, classtype], status: [vehicletype, condition] ]
 *  ]
 */
export function setAllPlayerData(allPlayerData: Array<Array<any>>, callback: Function) {
    verify.arr(allPlayerData, 'positions').fn(callback, 'callback').keepAlive();

    allPlayerData.forEach(function (playerData) {
        setPlayerData(playerData);
    });

    callback && callback(null, 201);
}

export function setPlayerData(playerData: Array<any>, callback?: Function) {
    verify.arr(playerData, 'playerData').str(playerData[0], 'playerData.name');

    var
        name = playerData[0],
        position = playerData[1],
        role = playerData[2],
        status = playerData[3],
        playerInfo = new PlayerInfo.PlayerInfo();

    if (position) {
        playerInfo.position = armaToPlayerPosition(position);
    }
    if (role) {
        playerInfo.role = armaToPlayerRole(role);
    }
    if (status) {
        playerInfo.status = armaToPlayerStatus(status);
    }

    persist.setPlayerData(name, playerInfo);

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

export function setPlayerPosition(name: string, position: Array<number>, callback: Function) {
    verify.str(name, 'name').arr(position, 'position').keepAlive();

    doSetPlayerPosition(name, position);
    callback(null, 201);
}

export function echo() {
    keepAlive();
    var args = Array.prototype.slice.call(arguments, 0);
    var callback = args.pop();

    logger.debug(args);

    callback(null, args);
}

function registerAll() {
    rpc.register('echo', echo);
    rpc.register('getDate', getDate);
    rpc.register('missionStart', missionStart);
    rpc.register('missionEnd', missionEnd);
    rpc.register('setIsStreamable', setIsStreamable);
    rpc.register('setPlayerPosition', setPlayerPosition);
    rpc.register('setAllPlayerData', setAllPlayerData);
    rpc.register('setPlayerData', setPlayerData);
}
