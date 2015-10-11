/// <reference path="./../typings/tsd.d.ts" />

import bunyan = require('bunyan')
import Configuration = require('./configuration')

export function getLogger(sourceFile: string): bunyan.Logger {

    var logger = bunyan.createLogger({
        name: sourceFile.split('/').pop(),
        streams: getStreams()
    });
    logger.level(Configuration.logLevel);


    return logger;
}

function getStreams(): Array<string> {
    var
        logFile = Configuration.logfile,
        streams = [];

    if (logFile) {
        streams.push({
            level: Configuration.logLevel,
            path: logFile
        })
    }
    if (Configuration.environment !== 'testing') {
        streams.push({
            level: Configuration.logLevel,
            stream: process.stdout
        });
    }
    return streams;
}