/// <reference path="./../typings/tsd.d.ts" />

import PlayerInfo = require('./PlayerInfo');
import persist = require('./persist');


export function init() {

    var dummyPos = new PlayerInfo.Point(2000, 1684);

    persist.missionStart('dummyMission', 'Stratis');
    persist.setIsStreamable(true);
    persist.setPlayerData('refZeroZero', new PlayerInfo.PlayerInfo(new PlayerInfo.Point(0, 0), 'civ'));
    persist.setPlayerData('refOneOne', new PlayerInfo.PlayerInfo(new PlayerInfo.Point(1000, 1000), 'civ'));
    persist.setPlayerData('dummyOpfor', new PlayerInfo.PlayerInfo(dummyPos, 'opfor'));

    setInterval(function () {
        dummyPos.x = dummyPos.x + 1;
        dummyPos.y = dummyPos.y + 2;
        persist.setPlayerPosition('dummyOpfor', dummyPos);
    }, 1000);
}