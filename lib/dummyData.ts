/// <reference path="./../typings/tsd.d.ts" />

import PlayerInfo = require('./PlayerInfo');
import rpc = require('./rpc');

export function init() {
    var
        dummyPos = [2000, 1684, 5, 45],
        interval, cnt = 0;

    rpc.missionStart('dummyMission', 'Stratis', function () {

        rpc.setAllPlayerData([
            ['refZeroZero', [0, 0, 0, 0], ['WEST', 'at'], ['alive', 'tank']],
            ['refOneOne', [1000, 1000, 0, 180], null, null],
            ['dummyOpfor', dummyPos, ['EAST', 'unknown'], ['alive']]
        ], function () {

        });

        rpc.setIsStreamable(true, function () {});
    });

    interval = setInterval(function () {
        if (cnt > 100) {
            clearInterval(interval);
        }
        cnt++;
        dummyPos[0] = dummyPos[0] + parseInt('' + Math.random() * 5, 10);
        dummyPos[1] = dummyPos[1] + parseInt('' + Math.random() * 3, 10);
        dummyPos[3] = dummyPos[3] + parseInt('' + Math.random() * 50, 10) % 360;
        rpc.setPlayerPosition('dummyOpfor', dummyPos, function () {});
    }, 1500);
}
