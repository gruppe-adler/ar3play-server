require('typescript-require');

import redis = require('redis');
import http = require('http');
import rpc = require('./lib/rpc');
import persist = require('./lib/persist');
import dummyData = require('./lib/dummyData');
import bunyan = require('bunyan');
import webserver = require('./lib/webserver');
var logger = bunyan.createLogger({name: __filename.split('/').pop()});

rpc.init(5555);
webserver.init(12302);

if (true) {
    dummyData.init();
}

logger.info('ready.');