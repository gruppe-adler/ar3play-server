var configuration = require('./lib/configuration.js');

var utilLoggingIHateYou = require('./node_modules/sock-rpc/node_modules/util-logging/lib/level.js');
utilLoggingIHateYou.isValid = function () {return false;};

configuration.environment = 'testing';

var app = require('./main.js');
var persist = require('./lib/persist.js');
var appIsReady = false;

module.exports.waitForApp = function (done) {
    if (appIsReady) {
        return done();
    }
    setTimeout(done, 500);
};

module.exports.resetAppState = function (done) {
    persist.clearPersistenceInstances();
    done();
};
