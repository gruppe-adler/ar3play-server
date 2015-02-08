"use strict";

var
    rpc = require('sock-rpc'),
    redis = require('redis'),
    redisClient = redis.createClient();

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
