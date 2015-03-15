
import bunyan = require('bunyan');

var logger = bunyan.createLogger({name: 'PlayerInfo'});

export class Position {
    x: number;
    y: number;
    z: number;
    dir: number;

    constructor(x: number, y: number, z: number, dir: number) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.dir = dir;
    }
    toJSON(): any {
        return {
            x: this.x,
            y: this.y,
            z: this.z,
            dir: this.dir
        }
    }
}

export class Role {
    side: string;
    classtype: string;

    constructor(side: string, classtype: string) {
        this.side = side;
        this.classtype = classtype;
    }
    toJSON(): any {
        return {
            side: this.side,
            classtype: this.classtype
        };
    }
}

export class PlayerInfo {
    position: Position;
    side: string;
    status: string;
    role: Role;
    vehicle: string;

    constructor(position?: Position, side?: string, status?: string) {
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
        var result: any = {};
        if (this.position) {
            result.position = this.position.toJSON();
        }
        if (this.status) {
            result.status = this.status
        }
        if (this.side) {
            result.side = this.side;
        }
        return result;
    }
}

export class Status {
    static ALIVE = 'alive';
    static UNCONSCIOUS = 'unconscious';
    static DEAD = 'dead';

    static values = [Status.ALIVE, Status.UNCONSCIOUS, Status.DEAD];
}

export class Classtype {
    static values = ['unknown', 'at', 'engineer', 'explosive', 'leader', 'medic', 'mg', 'officer', 'recon', 'virtual'];
}

export class Vehicle {
    static values = ['unknown', 'helicopter', 'motorcycle', 'tank', 'truck', 'ship', 'none'];
}

export class Side {
    static BLUFOR = 'blufor';
    static OPFOR = 'opfor';
    static IND = 'ind';
    static CIV = 'civ';
    static EMPTY = 'empty';

    static values = [Side.BLUFOR, Side.OPFOR, Side.IND, Side.CIV, Side.EMPTY];

    static fromGameSide(side: string): string {
        switch (side) {
            case 'WEST': return Side.BLUFOR;
            case 'EAST': return Side.OPFOR;
            case 'GUER': return Side.IND;
            case 'CIV': return Side.CIV;
            case 'EMPTY': return Side.EMPTY;
            default:
                logger.warn('ignoring unknown side ' + side);
                return null;
        }
    }
}