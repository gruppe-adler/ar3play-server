var configuration = require('./lib/configuration.js');

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
