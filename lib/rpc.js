/// <reference path="./../typings/tsd.d.ts" />
var _ = require('underscore');
var persist = require('./persist');
var PlayerInfo = require('./PlayerInfo');
var bunyan = require('bunyan');
var rpc = require('sock-rpc'), logger = bunyan.createLogger({ name: __filename.split('/').pop() });
logger.level('debug');
var watchForEnd = _.debounce(function () {
    logger.warn('timeout! declaring mission as ended');
    persist.missionEnd();
}, 30000);
function init(port) {
    registerAll();
    rpc.listen("::1", port);
    logger.info('listening for RPC calls on port ' + port);
    watchForEnd();
}
exports.init = init;
function registerAll() {
    /**
     *  Echo back all arguments passed.
     *  echo(...,callback);
     */
    rpc.register('echo', function () {
        watchForEnd();
        var args = Array.prototype.slice.call(arguments, 0);
        var callback = args.pop();
        logger.debug(args);
        callback(null, args);
    });
    /**
     *  Get date (no arguments)
     */
    rpc.register('getDate', function (callback) {
        watchForEnd();
        logger.debug('getDate called :)');
        callback(null, new Date().toString());
    });
    rpc.register('missionStart', function (missionName, worldname, callback) {
        watchForEnd();
        logger.info('mission started: ' + missionName);
        persist.missionStart(missionName, worldname);
        callback(null, 201);
    });
    rpc.register('missionEnd', function (callback) {
        console.log('missionEnd');
        persist.missionEnd();
        callback(null, 201);
    });
    rpc.register('setIsStreamable', function (isStreamable, cb) {
        watchForEnd();
        persist.setIsStreamable(isStreamable);
        cb(null, 201);
    });
    rpc.register('setPlayerPosition', function (name, position, callback) {
        watchForEnd();
        persist.setPlayerPosition(name, new PlayerInfo.Point(position[0].toFixed(0), position[1].toFixed(0)));
        callback(null, 201);
    });
    rpc.register('setPlayerSide', function (playerName, side, cb) {
        watchForEnd();
        logger.debug('playerside ' + playerName + ': ' + side);
        persist.setPlayerSide(playerName, PlayerInfo.Side.fromGameSide(side));
        cb && cb(null, 201);
    });
    rpc.register('setPlayerStatus', function (playerName, status, callback) {
        watchForEnd();
        logger.debug('playerstatus ' + playerName + ': ' + status);
        persist.setPlayerStatus(playerName, status);
        callback(null, 201);
    });
}
//# sourceMappingURL=rpc.js.map