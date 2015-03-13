/// <reference path="./../typings/tsd.d.ts" />

import underscore = require('underscore');
import persist = require('./persist');
import PlayerInfo = require('./PlayerInfo');
import bunyan = require('bunyan');

var
    rpc = require('sock-rpc'),
    logger = bunyan.createLogger({name: __filename.split('/').pop()});

logger.level('debug');

export function init(port) {
    registerAll();

    rpc.listen("::1", port);
    logger.info('listening for RPC calls on port ' + port);
}

function registerAll() {
    /**
     *  Echo back all arguments passed.
     *  echo(...,callback);
     */
    rpc.register('echo', function () {

        var args = Array.prototype.slice.call(arguments, 0);
        var callback = args.pop();

        logger.debug(args);

        callback(null, args);
    });

    /**
     *  Get date (no arguments)
     */
    rpc.register('getDate', function (callback) {
        logger.debug('getDate called :)');
        callback(null, new Date().toString());
    });

    rpc.register('missionStart', function (missionName: string, worldname: string, callback: Function) {
        persist.missionStart(missionName, worldname);
        callback(null, 201);
    });

    rpc.register('missionEnd', function (callback: Function) {
        console.log('missionEnd');
        persist.missionEnd();
        callback(null, 201);
    });

    rpc.register('setIsStreamable', function (isStreamable: boolean, cb: Function) {
        persist.setIsStreamable(isStreamable);
        cb(null, 201);
    });

    rpc.register('setPlayerPosition', function (name, position, callback) {
        console.log(name + ': ' + position.map(function (p) {
            return p.toFixed(0);
        }).join('/'));

        persist.setPlayerPosition(name, new PlayerInfo.Point(position[0].toFixed(0), position[1].toFixed(0)));
        callback(null, 201);
    });

    rpc.register('setPlayerSide', function (playerName: string, side: string, cb) {
        logger.debug('playerside ' + playerName + ': ' + side);
        persist.setPlayerSide(playerName, PlayerInfo.Side.fromGameSide(side));

        cb && cb(null, 201);
    });

    rpc.register('setPlayerStatus', function (playerName: string, status: string, callback) {
        logger.debug('playerstatus ' + playerName + ': ' + status);
        persist.setPlayerStatus(playerName, status);
        callback(null, 201);
    });

}
