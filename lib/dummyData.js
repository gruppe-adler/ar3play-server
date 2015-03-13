/// <reference path="./../typings/tsd.d.ts" />
var PlayerInfo = require('./PlayerInfo');
var persist = require('./persist');
function init() {
    var dummyPos = new PlayerInfo.Point(2000, 1684);
    persist.missionStart('dummyMission', 'Stratis', function () {
        persist.setPlayerData('refZeroZero', new PlayerInfo.PlayerInfo(new PlayerInfo.Point(0, 0)));
        persist.setPlayerData('refOneOne', new PlayerInfo.PlayerInfo(new PlayerInfo.Point(1000, 1000)));
        persist.setPlayerData('dummyOpfor', new PlayerInfo.PlayerInfo(dummyPos, 'opfor'));
        persist.setPlayerSide('refZeroZero', 'ind');
        persist.setPlayerSide('refOneOne', 'civ');
        persist.setIsStreamable(true);
    });
    setInterval(function () {
        dummyPos.x = dummyPos.x + parseInt('' + Math.random() * 5, 10);
        dummyPos.y = dummyPos.y + parseInt('' + Math.random() * 3, 10);
        persist.setPlayerPosition('dummyOpfor', dummyPos);
    }, 1500);
}
exports.init = init;
//# sourceMappingURL=dummyData.js.map