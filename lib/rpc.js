/// <reference path="./../typings/tsd.d.ts" />
var persist = require('./persist');
var PlayerInfo = require('./PlayerInfo');
var bunyan = require('bunyan');
var rpc = require('sock-rpc'), logger = bunyan.createLogger({ name: __filename.split('/').pop() });
logger.level('debug');
function init(port) {
    registerAll();
    rpc.listen("::1", port);
    logger.info('listening for RPC calls on port ' + port);
}
exports.init = init;
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
    rpc.register('missionStart', function (missionName, worldname, callback) {
        persist.missionStart(missionName, worldname);
        callback(null, 201);
    });
    rpc.register('missionEnd', function (callback) {
        console.log('missionEnd');
        persist.missionEnd();
        callback(null, 201);
    });
    rpc.register('setIsStreamable', function (isStreamable, cb) {
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
    rpc.register('setPlayerSide', function (playerName, side, cb) {
        logger.debug('playerside ' + playerName + ': ' + side);
        persist.setPlayerSide(playerName, PlayerInfo.Side.fromGameSide(side));
        cb && cb(null, 201);
    });
    rpc.register('setPlayerStatus', function (playerName, status, callback) {
        logger.debug('playerside ' + playerName + ': ' + status);
        persist.setPlayerStatus(playerName, status);
        callback(null, 201);
    });
}
//# sourceMappingURL=rpc.js.map