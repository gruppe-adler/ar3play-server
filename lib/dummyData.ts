/// <reference path="./../typings/tsd.d.ts" />

import rpc = require('./rpc');

var dummyCallback = function () {};

export function init() {
    var
        dummyPos = [2000, 1684, 5],
        dummyDir = 45,
        interval, cnt = 0;

    rpc.missionStart('dummyMission', 'Stratis', function () {
        /* [
         *   [
         *     id: int,
         *     [x: int, y: int, z: int],
         *     dir: int,
         *     side: string,
         *     health: string,
         *     icon: string,
         *     name: string,
         *     container: int,
         *     content: int[]
         *   ]
         * ]
         *
         *
         */
        rpc.setAllUnitData([
            [1, [1, 1, 0], 0, 'WEST', 'alive', 'iconManAT', 'refZeroZero'],
            [2, [10, 10, 0], 0, 'WEST', 'alive', 'iconManAT', 'refZeroZeroOne', 3],
            [3, [10, 10, 0], 0, 'WEST', 'alive', 'helicopter', 'Heli 1'],
            [4, [20, 10, 0], 0, 'CIV', 'alive', 'truck', 'foo truck'],
            [5, [10, 20, 0], 90, 'EAST', 'alive', 'unknown', 'refZeroZeroThree'],
            [6, dummyPos, 45, 'EAST', 'alive', 'iconManOfficer', 'dummy opfor officer', null, null]
        ], dummyCallback);

        rpc.setIsStreamable(true, function () {});
    });

    interval = setInterval(function () {
        if (cnt > 100) {
            rpc.setUnitDatum([6, null, null, null, 'dead', 'iconManOfficer'], dummyCallback);
            clearInterval(interval);
        }
        cnt++;
        dummyPos[0] = dummyPos[0] + parseInt('' + Math.random() * 5, 10);
        dummyPos[1] = dummyPos[1] + parseInt('' + Math.random() * 3, 10);
        dummyDir = dummyDir + parseInt('' + Math.random() * 50, 10) % 360;
        rpc.setUnitDatum([6, dummyPos, dummyDir], dummyCallback);
    }, 1500);
}
