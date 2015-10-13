
var
    exec = require('child_process').exec,
    app = require(__dirname + '/../../test.js'),
    redisClient,
    rpcClient,
    config,
    isRpcConnected = false;

function doRpc(methodName, args, callback) {
    rpcClient.sock_rpc.apply(rpcClient, [
        methodName,
        args,
        callback
    ]);
}

var parseResult = function (returnString) {
    return JSON.parse(returnString)[1];
};


module.exports.setRedis = function (newRedisClient) {
    redisClient = newRedisClient;
};

module.exports.setConfig = function (newConfig) {
    config = newConfig;
};

module.exports.setRpcClient = function (newRpcClient) {
    rpcClient = newRpcClient;
};

module.exports.doRpc = doRpc;

module.exports.flushDb = function (done) { // FLUSH REDIS BEFORE THIS TEST SUITE
    redisClient.select(config.Redis.db, function (err, result) {
        if (err) {
            throw err;
        }
        redisClient.flushdb(function () {
            if (err) {
                throw err;
            }
            done();
        });
    });
};

module.exports.flushDbAndResetApplicationState = function (done) {
    module.exports.flushDb(function (err) {
        if (err) {
            throw err;
        }
        app.resetAppState(function (err) {
            done();
        });

    })
};

module.exports.fillRedis = function (done) { // put data into redis
    var filename = __dirname + '/fixtures/redis.txt';
    var cmd = 'cat ' + filename + ' | redis-cli -n ' + config.Redis.port;

    exec(cmd, function(error, stdout, stderr) {
        if (error) {
            throw error;
        }
        done();
    });
};

module.exports.rpcConnect = function (clientIdSetter) {
    return function (done) { // CONNECT TO SERVER SOCKET AND GET OWN CLIENTID

        if (isRpcConnected) {
            rpcClient.disconnect();
        }
        rpcClient.connect(function (err) {
            if (err) {
                throw err;
            }
            doRpc('getClientId', [], function (err, result) {
                if (err) {
                    throw err;
                }
                isRpcConnected = true;
                clientIdSetter(parseResult(result));
                done();
            });
        });
    };
};

module.exports.getMissionStartAsBeforeFunction = function (missionName, worldName, newInstanceIdCallback) {
    return function (done) {
        doRpc('missionStart', [missionName, worldName], function (err, result) {
            var newInstanceId = parseResult(result);
            newInstanceIdCallback(newInstanceId);
            done();
        });
    };
};