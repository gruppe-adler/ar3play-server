"use strict";

var
    rpc = require('sock-rpc'),
    redis = require('redis'),
    redisClient = redis.createClient(),
    http = require('http'),
    positions = {
        refZeroZero: [0, 0],
        refOneOne: [1000, 1000],
        dummy: [2000, 1684]
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
    console.log(name + ': ' + position.map(function (p) {return p.toFixed(0);}).join('/'));
    positions[name] = position;
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

    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(positions));
}).listen(12302);


setInterval(function () {
    positions.dummy[0] += 1;
    positions.dummy[1] += 2;
}, 1000);