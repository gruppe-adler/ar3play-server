
export class Side {
    static WEST = 'WEST';
    static EAST = 'EAST';
    static GUER = 'GUER';
    static CIV = 'CIV';
    static AMBIENT_LIFE = 'AMBIENT LIFE';
    static ENEMY = 'ENEMY';
    static LOGIC = 'LOGIC';
    static UNKNOWN = 'UNKNOWN';

    static values = [Side.WEST, Side.EAST, Side.GUER, Side.CIV, Side.AMBIENT_LIFE, Side.ENEMY, Side.LOGIC, Side.UNKNOWN];
}

export class Health {
    static ALIVE = 'alive';
    static UNCONSCIOUS = 'unconscious';
    static DEAD = 'dead';

    static values = [Health.ALIVE, Health.UNCONSCIOUS, Health.DEAD];
}

class Model {
    static fromJSON(json: string): Unit {
        var
            obj = JSON.parse(json),
            result = new Unit();

        Object.keys(obj).forEach(function (key) {
            if (obj[key] !== undefined) {
                result[key] = obj[key];
            }
        });

        return result;
    }

    toJSON(): Object {
        var that: Model = this,
            result: any = {};

        Object.keys(that).forEach(function (key) {
            if (that[key] !== undefined) {
                result[key] = that[key];
            }
        });

        return result;
    }

    augment<T>(model: T): T {
        var that = this;

        Object.keys(that).forEach(function (key) {
            if (model[key] === undefined || that[key] === null) {
                model[key] = that[key];
            }
        });

        return model;
    }
}

export class Unit extends Model {
    id: number;
    position: Array<number>;
    direction: number;
    side: Side;
    health: Health;
    icon: string;
    name: string;
    content: Array<number>;
    container: number;
}
