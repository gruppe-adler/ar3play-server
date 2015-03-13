/// <reference path="./../typings/tsd.d.ts" />
var PlayerInfo = require('./PlayerInfo');
var persist = require('./persist');
function init() {
    var dummyPos = new PlayerInfo.Point(2000, 1684);
    persist.missionStart('dummyMission', 'Stratis');
    persist.setIsStreamable(true);
    persist.setPlayerData('refZeroZero', new PlayerInfo.PlayerInfo(new PlayerInfo.Point(0, 0), 'civ'));
    persist.setPlayerData('refOneOne', new PlayerInfo.PlayerInfo(new PlayerInfo.Point(1000, 1000), 'civ'));
    persist.setPlayerData('dummyOpfor', new PlayerInfo.PlayerInfo(dummyPos, 'opfor'));
    persist.setPlayerSide('dummyOpfor', 'opfor');
    persist.setPlayerSide('refZeroZero', 'ind');
    persist.setPlayerSide('refOneOne', 'civ');
    setInterval(function () {
        dummyPos.x = dummyPos.x + 1;
        dummyPos.y = dummyPos.y + 2;
        persist.setPlayerPosition('dummyOpfor', dummyPos);
    }, 1000);
}
exports.init = init;
//# sourceMappingURL=dummyData.js.map