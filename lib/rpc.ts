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

function registerAll() {
    /**
     *  Echo back all arguments passed.
     *  echo(...,callback);
     */
    rpc.register('echo', function () {
        keepAlive();
        var args = Array.prototype.slice.call(arguments, 0);
        var callback = args.pop();

        logger.debug(args);

        callback(null, args);
    });

    /**
     *  Get date (no arguments)
     */
    rpc.register('getDate', function (callback: Function) {
        keepAlive();
        logger.debug('getDate called :)');
        callback(null, new Date().toString());
    });

    rpc.register('missionStart', function (missionName: string, worldname: string, callback: Function) {
        verify.str(missionName, 'missionName').str(worldname, 'worldname').keepAlive();
        logger.info('mission started: ' + missionName);
        persist.missionStart(missionName, worldname);
        callback(null, 201);
    });

    rpc.register('missionEnd', function (callback: Function) {
        console.log('missionEnd');
        persist.missionEnd();
        callback(null, 201);
    });

    rpc.register('setIsStreamable', function (isStreamable: boolean, cb: Function) {
        keepAlive();
        persist.setIsStreamable(isStreamable);
        cb(null, 201);
    });

    rpc.register('setPlayerPosition', function (name: string, position: Array<number>, callback: Function) {
        verify.str(name, 'name').arr(position, 'position').keepAlive();

        persist.setPlayerPosition(name, new PlayerInfo.Point(
            parseInt(position[0].toFixed(0), 10),
            parseInt(position[1].toFixed(0), 10))
        );
        callback(null, 201);
    });

    rpc.register('setPlayerSide', function (playerName: string, side: string, cb) {
        verify.str(playerName, 'playerName').str(side, 'side').keepAlive();
        logger.debug('playerside ' + playerName + ': ' + side);
        persist.setPlayerSide(playerName, PlayerInfo.Side.fromGameSide(side));

        cb && cb(null, 201);
    });

    rpc.register('setPlayerStatus', function (playerName: string, status: string, callback) {
        verify.str(playerName, 'playerName').str(status, 'status').keepAlive();
        logger.debug('playerstatus ' + playerName + ': ' + status);
        persist.setPlayerStatus(playerName, status);
        callback(null, 201);
    });
}
