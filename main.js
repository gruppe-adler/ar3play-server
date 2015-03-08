"use strict";
var PlayerInfo = (function () {
    function PlayerInfo(position, side) {
        this.position = position;
        this.side = side;
    }
    return PlayerInfo;
})();
var rpc = require('sock-rpc'), redis = require('redis'), redisClient = redis.createClient(), http = require('http'), players = {
    refZeroZero: new PlayerInfo({ x: 0, y: 0 }, 'civ'),
    refOneOne: new PlayerInfo({ x: 1000, y: 1000 }, 'civ'),
    dummy: new PlayerInfo({ x: 2000, y: 1684 }, 'opfor')
};
redisClient.select(2);
/**
 *  Echo back all arguments passed.
 *  echo(...,callback);
 */
rpc.register("echo", function () {
    var args = Array.prototype.slice.call(arguments, 0);
    var callback = args.pop();
    console.log(args);
    callback(null, args);
});
/**
 *  Get date (no arguments)
 */
rpc.register("getDate", function (callback) {
    console.log('getDate called :)');
    callback(null, new Date().toString());
});
rpc.register("setPosition", function (name, position, callback) {
    console.log(name + ': ' + position.map(function (p) {
        return p.toFixed(0);
    }).join('/'));
    players[name].position.x = position[0];
    players[name].position.y = position[1];
    callback(null, new Date().toISOString());
});
rpc.register("setKilled", function (callback) {
    console.log(arguments);
    callback(null, new Date().toISOString());
});
rpc.register("setMission", function (missionName, callback) {
    console.log(missionName);
    redisClient.set('missionName', missionName);
    callback();
});
rpc.register("setPlayerNames", function (playerNames, callback) {
    redisClient.set('playerNames', playerNames);
    callback();
});
rpc.register("setPlayerSide", function (playerName, side) {
    var clientSide;
    switch (side) {
        case "WEST":
            clientSide = 'blufor';
            break;
        case "EAST":
            clientSide = 'opfor';
            break;
        case "GUER":
            clientSide = 'ind';
            break;
        case "CIV":
            clientSide = 'civ';
            break;
        default:
            clientSide = 'unknown';
            console.log('strange side: ' + side);
    }
    players[playerName].side = clientSide;
});
rpc.listen("::1", 5555);
http.createServer(function (req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    // intercept OPTIONS method
    if ('OPTIONS' == req.method) {
        res.send(200);
        res.end();
        return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(players));
}).listen(12302);
setInterval(function () {
    players.dummy.position.x += 1;
    players.dummy.position.y += 2;
}, 1000);
//# sourceMappingURL=main.js.map