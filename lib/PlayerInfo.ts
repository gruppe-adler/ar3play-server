
export class Point {
    x: number;
    y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
    toJSON(): any {
        return {
            x: this.x,
            y: this.y
        }
    }

}

export class PlayerInfo {
    position: Point;
    side: string;
    status: string;

    constructor(position?: Point, side?: string, status?: string) {
        this.position = position;
        this.side = side;
        this.status = status;
    }
    augment(playerInfo?: PlayerInfo): PlayerInfo {
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
    }
    toJSON(): any {
        var position = null;
        if (this.position) {
            position = this.position.toJSON();
        }
        return {
            position: position
        };
    }
}

export class Status {
    static ALIVE = 'alive';
    static UNCONSCIOUS = 'unconscious';
    static DEAD = 'dead';
}

export class Side {
    static BLUFOR = 'blufor';
    static OPFOR = 'opfor';
    static IND = 'ind';
    static CIV = 'civ';
    static EMPTY = 'empty';

    static fromGameSide(side: string): string {
        switch (side) {
            case 'WEST': return Side.BLUFOR;
            case 'EAST': return Side.OPFOR;
            case 'GUER': return Side.IND;
            case 'CIV': return Side.CIV;
            case 'EMPTY': return Side.EMPTY;
            default: throw new Error('unknown side ' + side);
        }
    }
}