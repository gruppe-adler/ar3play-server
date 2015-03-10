var Point = (function () {
    function Point(x, y) {
        this.x = x;
        this.y = y;
    }
    return Point;
})();
exports.Point = Point;
var PlayerInfo = (function () {
    function PlayerInfo(position, side, status) {
        this.position = position;
        this.side = side;
        this.status = status;
    }
    PlayerInfo.prototype.add = function (playerInfo) {
        if (!playerInfo) {
            return this;
        }
        if (!playerInfo.position) {
            playerInfo.position = this.position;
        }
        if (!playerInfo.side) {
            playerInfo.side = this.side;
        }
        if (!playerInfo.status) {
            playerInfo.status = this.status;
        }
        return playerInfo;
    };
    return PlayerInfo;
})();
exports.PlayerInfo = PlayerInfo;
var Status = (function () {
    function Status() {
    }
    Status.ALIVE = 'alive';
    Status.UNCONSCIOUS = 'unconscious';
    Status.DEAD = 'dead';
    return Status;
})();
exports.Status = Status;
var Side = (function () {
    function Side() {
    }
    Side.fromGameSide = function (side) {
        switch (side) {
            case 'WEST': return Side.BLUFOR;
            case 'EAST': return Side.OPFOR;
            case 'GUER': return Side.IND;
            case 'CIV': return Side.CIV;
            case 'EMPTY': return Side.EMPTY;
            default: throw new Error('unknown side ' + side);
        }
    };
    Side.BLUFOR = 'blufor';
    Side.OPFOR = 'opfor';
    Side.IND = 'ind';
    Side.CIV = 'civ';
    Side.EMPTY = 'empty';
    return Side;
})();
exports.Side = Side;
//# sourceMappingURL=PlayerInfo.js.map