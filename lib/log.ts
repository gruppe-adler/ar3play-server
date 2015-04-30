/// <reference path="./../typings/tsd.d.ts" />

import bunyan = require('bunyan')
import Configuration = require('./configuration')

export function getLogger(sourceFile: string): bunyan.Logger {
    var logger = bunyan.createLogger({name: sourceFile.split('/').pop()});
    logger.level(Configuration.logLevel);

    return logger;
}