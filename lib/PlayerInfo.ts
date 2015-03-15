/// <reference path="./../typings/tsd.d.ts" />

import bunyan = require('bunyan');
import _ = require('underscore');

var logger = bunyan.createLogger({name: 'PlayerInfo'});

function filterEmpty(val) {
    return !!val;
}

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
        return _.pick(this, filterEmpty);
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
        return _.pick(this, filterEmpty);
    }
}

export class PlayerInfo {
    position: Position;
    status: Status;
    role: Role;
    vehicle: string;

    constructor(position?: Position, role?: Role, status?: Status) {
        this.position = position;
        this.role = role;
        this.status = status;
    }
    augment(playerInfo?: PlayerInfo): PlayerInfo {
        if (!playerInfo) {
            return this;
        }
        if (!playerInfo.position) {
            playerInfo.position = this.position;
        }
        if (!playerInfo.role) {
            playerInfo.role = this.role;
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
        if (this.role) {
            result.role = this.role;
        }
        return result;
    }
}

export class Condition {

    static ALIVE = 'alive';
    static UNCONSCIOUS = 'unconscious';
    static DEAD = 'dead';

    static values = [Condition.ALIVE, Condition.UNCONSCIOUS, Condition.DEAD];
}

export class Status {
    vehicle: string;
    condition: string;

    constructor(condition: string, vehicle?: string) {
        this.condition = condition;
        this.vehicle = vehicle;
    }
    toJSON(): any {
        return _.pick(this, filterEmpty);
    }
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