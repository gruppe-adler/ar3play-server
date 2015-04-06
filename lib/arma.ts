/// <reference path="./../typings/tsd.d.ts" />

import log = require('./log')
import models = require('./models')
import util = require('./util');

var logger = log.getLogger(__filename);

function setId(model: models.Unit, id: any) {
    id = parseInt(id, 10);
    if (!id) {
        throw new TypeError('invalid id ' + typeof id);
    }
    model.id = id;
}

function setName(model: models.Unit, name: any) {
    if (!name) {
        return;
    }
    name = ('' + name).substr(0, 32);

    model.name = name;
}

function setPosition(model: models.Unit, position: any) {
    if (!position) {
        return;
    }
    if (!Array.isArray(position) || position.length > 3) {
        logger.error('invalid position of type ' + typeof position);
        console.log(position);
        return;
    }
    position = position.map(util.toInt);

    model.position = position;
}

function setDirection(model: models.Unit, direction: any) {
    if (direction === null) {
        return;
    }
    if (typeof direction !== 'number') {
        logger.warn('invalid direction ' + direction);
        return;
    }
    model.direction = parseInt(direction, 10);
}

function setSide(model: models.Unit, side: any) {
    if (!side) {
        return;
    }
    if (models.Side.values.indexOf(side) !== -1) {
        model.side = side;
        return;
    }
    logger.warn('ignoring unknown side ' + side);
}

function setHealth(model: models.Unit, health: any) {
    if (!health) {
        return;
    }
    if (models.Health.values.indexOf(health) !== -1) {
        model.health = health;
    } else {
        logger.warn('ignoring unknown health ' + health);
    }
}

function setIcon(model: models.Unit, icon: any) {
    if (!icon) {
        return;
    }

    if (typeof icon !== 'string') {
        throw new TypeError('icon must be string: ' + typeof icon);
    }

    model.icon = icon;
}

function setContainer(unit: models.Unit, container: any) {
    if (!container && typeof container !== 'number') {
        return;
    }
    unit.container = container;
}

export function setContent(unit: models.Unit, content: any) {
    if (!content) {
        return;
    }
    if (!Array.isArray(content)) {
        throw new TypeError('content must be array');
    }
    unit.content = content.map(util.toInt);
}

export function toUnit(datum: Array<any>): models.Unit {

    var unit = new models.Unit();
    setId(unit, datum[0]);
    setPosition(unit, [datum[1], datum[2], datum[3]]);
    setDirection(unit, datum[4]);
    setSide(unit, datum[5]);
    setHealth(unit, datum[6]);
    setIcon(unit, datum[7]);
    setName(unit, datum[8]);
    setContainer(unit, datum[9]);
    setContent(unit, datum[10]);

    return unit;
}
