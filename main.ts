require('typescript-require');

import redis = require('redis');
import http = require('http');
import rpc = require('./lib/rpc');
import persist = require('./lib/persist');
import dummyData = require('./lib/dummyData');
import bunyan = require('bunyan');
import webserver = require('./lib/webserver');
import config = require('./lib/configuration');
import cleanup = require('./lib/cleanup');
var logger = bunyan.createLogger({name: __filename.split('/').pop()});

rpc.init(config.Rpc.port);
if (config.Webserver.port) {
    webserver.init(config.Webserver.port);
} else {
    logger.info('HTTP port not set, will not start HTTP server');
}

if (config.environment === 'development') {
    dummyData.init();
}

if (config.redis_max_used_memory) {
    logger.info('Starting to restrict Redis memory usage to approx ' + config.redis_max_used_memory + ' bytes.');
    cleanup.init(config.redis_max_used_memory);
} else {
    logger.warn('Will not be monitoring Redis memory usage.');
}

logger.info('ready.');