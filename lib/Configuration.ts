/// <reference path="./../typings/tsd.d.ts" />

import fs = require('fs');
import _ = require('underscore');
import sf = require('sprintf');

var
    sprintf = sf.sprintf;

export class Redis {
    static host: string;
    static port: number;
    static db: number;
}

export class Webserver {
    static port: number;
}

export class Rpc {
    static port: number;
}

function friendlyMemoryConfigToBytes(friendlyString: string): number {
    var
        bits = friendlyString.match(/^([0-9]+)([KMG])?$/),
        siBase = 1024,
        siMap = {
            '': 0,
            'K': 1,
            'M': 2,
            'G': 3
        };

    if (!bits) {
        throw new Error(sprintf('invalid memory string. Was "%s", but should be numeric + optional K|M|G', friendlyString));
    }
    return parseInt(bits[1], 10) * Math.pow(siBase, siMap[bits[2] || '']);

}

function assertTypes(collection: any, variables: any) {
    _.each(variables, function (typ, name) {
        if (typeof collection[name] !== typ) {
            throw new Error(name + ' is no ' + typ + ' ( ' + collection[name] + ' )');
        }
    });
}

export var environment: string = 'development';
export var authenticationFileName: string = '';
export var logLevel: string = 'info';
export var redis_max_used_memory: number = 0;

(function init() {

    var
        configFileName =__dirname + '/../config.json',
        configFile,
        config: any;

    if (!fs.existsSync(configFileName)) {
        throw new Error('config file missing!');
    }

    configFile = fs.readFileSync(configFileName);
    if (!configFile) {
        throw new Error('config file unreadable or empty!');
    }

    config = JSON.parse(configFile);
    if (!config) {
        throw new Error('config seems not to be valid JSON ;(');
    }

    if (config.redis_max_used_memory) {
        config.redis_max_used_memory = friendlyMemoryConfigToBytes(config.redis_max_used_memory)
    }

    assertTypes(config, {
        redis_port: 'number',
        redis_host: 'string',
        redis_db: 'number',
        webserver_port: 'number',
        rpc_port: 'number'
    });
    if (['development', 'production'].indexOf(config.environment) === -1) {
        throw new Error('environment must be one of: development, production');
    }

    Redis.host = config.redis_host;
    Redis.port = config.redis_port;
    Redis.db = config.redis_db;

    Webserver.port = config.webserver_port;
    Rpc.port = config.rpc_port;

    environment = config.environment;
    authenticationFileName = config.authentication_filename;
    logLevel = config.log_level || logLevel;
    redis_max_used_memory = config.redis_max_used_memory || 0;
}());
