/// <reference path="./../typings/tsd.d.ts" />

import sf = require('sprintf');
import log = require('./log');
import Configuration = require('./configuration');
import Mission = require('./mission');
import persist = require('./persist');
import webserver = require('./webserver');
import _ = require('underscore');

var logger = log.getLogger(__filename);

var
    maxRedisUsedMem,
    normalCheckInterval: number = 120 * 1000,
    checkInterval = normalCheckInterval,
    sprintf = sf.sprintf;

function checkLimitReached(cb: AsyncResultCallback<boolean>) {
    persist.getUsedMemory(function (error: Error, usedMemory: number) {

        cb(error, usedMemory >= maxRedisUsedMem);
    })
}

function deleteLatestMission(cb: ErrorCallback) {
    persist.getOldestMission(function (error: Error, missionInfo: Mission.MissionInfo) {
        if (!missionInfo) {
            cb(new Error('no replays left to delete'));
            return;
        }
        logger.debug(sprintf('deleting mission %s …', missionInfo.instanceId));
        persist.deleteMissionInstance(missionInfo.instanceId, cb)
    });
}

function loop() {
    logger.trace('checking memory usage');
    checkLimitReached(function (error: Error, isLimitReached: boolean) {
        if (isLimitReached) {
            logger.info('memory limit reached, locking web server');
            checkInterval = 1000;
            webserver.setIsInMaintenanceMode(true);
            setTimeout(function () {
                logger.debug('deleting oldest replay');
                deleteLatestMission(function (error: Error) {
                    if (error) {
                        logger.error(error);
                    } else {
                        webserver.setIsInMaintenanceMode(false);
                    }
                    setTimeout(loop, checkInterval);
                });
            }, 1000);

        } else {
            logger.debug('memory usage ok');
            checkInterval = normalCheckInterval;
            setTimeout(loop, checkInterval);
        }
    });
}

export function init(mem: number): void {
    maxRedisUsedMem = mem;

    loop();
}
