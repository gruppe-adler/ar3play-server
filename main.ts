require('typescript-require');

import redis = require('redis');
import http = require('http');
import rpc = require('./lib/rpc');
import persist = require('./lib/persist');
import dummyData = require('./lib/dummyData');
import bunyan = require('bunyan');
import webserver = require('./lib/webserver');
import config = require('./lib/Configuration');
var logger = bunyan.createLogger({name: __filename.split('/').pop()});

rpc.init(config.Rpc.port);
webserver.init(config.Webserver.port);

if (config.environment === 'development') {
    dummyData.init();
}

logger.info('ready.');