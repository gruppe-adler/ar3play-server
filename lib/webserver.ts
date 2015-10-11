/// <reference path="./../typings/tsd.d.ts" />

import restify = require('restify');
import log = require('./log');
import persist = require('./persist');
import models = require('./models');
import mission = require('./mission');
import authentication = require('./authentication');
import Configuration = require('./configuration');

var
    logger = log.getLogger(__filename),
    server = restify.createServer({log: log.getLogger('restify')}),
    isInMaintenanceMode: boolean = false;

function parseQuery(query: string): any {
    var params = {};
    query.split('&').forEach(function (param) {
        var
            bits = param.split('='),
            name = decodeURIComponent(bits[0]),
            value = null;
        if (bits[1]) {
            value = decodeURIComponent(bits[1]);
        }

        params[name] = value;
    });

    return params;
}

function getQueryAsObject(req: restify.Request): any {
    var nakedQuery = req.query();
    return typeof nakedQuery === 'string' ? parseQuery(nakedQuery) : {}
}

export function init(port: number): void {
    server.listen(port);
    logger.info('HTTP server listening on ' + port);

    server.on('uncaughtException', function (req: restify.Request, res: restify.Response, route, err: Error) {
        logger.error(err);
    });
}

export function setIsInMaintenanceMode(val: boolean) {

    isInMaintenanceMode = val;
}

function returnAllMissions(req: restify.Request, res: restify.Response) {
    persist.getAllMissions(function (error: Error, missions: Array<mission.MissionInfo>) {

        res.send(missions);
    });
}

function returnCurrentMission(req: restify.Request, res: restify.Response) {
    persist.getCurrentMission(function (error: Error, instanceId: string) {
        res.send(200, instanceId);
    });
}

function returnCurrentMissions(req: restify.Request, res: restify.Response) {
    persist.getCurrentMissions(function (error: Error, instanceIds: Array<string>) {
        res.send(200, instanceIds);
    });
}

function getMissionDetails(req: restify.Request, res: restify.Response) {
    persist.getMissionDetails(req.params.id, function (error: Error, data: Object) {
        if (error) {
            logger.error(error);
            return res.send(500);
        }

        res.send(data);
    });
}

function getMissionChanges(req: restify.Request, res: restify.Response) {
    var
        query = getQueryAsObject(req),
        from = query.from && parseInt(query.from, 10),
        to = query.to && parseInt(query.to, 10);

    if (!req.params.id) {
        throw new Error('i did something very wrong');
    }

    if (!(from && to)) {
        logger.warn('no from and to: ' + from + ' ' + to + ' query ' + JSON.stringify(query));
        return res.send(400, 'need from and to parameters, both being timestamps');
    }

    if (to - from < 1 || to - from > 100) {
        return res.send(400, 'interval must be 0<interval<100 seconds');
    }

    persist.getMissionChanges(req.params.id, from, to, function (error: Error, data: HashMap<string, models.Unit>) {
        var result = {};
        if (error) {
            logger.error(error);
        }

        if (data) {
            data.forEach(function (info: models.Unit, name: string) {
                if (info) {
                    result[name] = info
                }
            });
        }

        res.send(error ? 500 : 200, result);
    });
}

function missionAuthentication(req: restify.Request, res: restify.Response, next: restify.Next) {
    persist.getCurrentMission(function (error: Error, instanceId: string) {
        if (req.params.id && (instanceId !== req.params.id)) { // catch current mission
            return next();
        }

        return res.send(500);

        // TODO: re-implement and return all mission instances from all connected rpc clients
/*
        persist.getIsStreamable(function (error: Error, isStreamable: boolean) {
            if (error) {
                logger.error(error);
                return res.send(500);
            }
            if (!isStreamable) {
                return res.send(403);
            }

            next();
        });
        */
    });
}

function secretAuthentication(req: restify.Request, res: restify.Response, next: restify.Next) {
    var user,
        query = getQueryAsObject(req),
        secret = (query.secret || req.headers.authentication);

    if (secret) {
        authentication.auth(secret);
        user = authentication.getUser();
        if (user.rank === authentication.User.RANK_ADMIN) {
            next();
        } else {
            return res.send(403);
        }
    } else {
        return res.send(401);
    }
}

function deleteMissionInstance(req: restify.Request, res: restify.Response, next: restify.Next) {
    var instanceIdToDelete = req.params.id;

    if (!instanceIdToDelete) {
        return res.send(400, 'missing instance id parameter');
    }

    persist.getCurrentMission(function (err: Error, currentInstanceId: string) {
        if (err) {
            return res.send(500);
        }

        if (currentInstanceId === instanceIdToDelete) {
            return res.send(400, 'cant delete currently running mission instance');
        }

        persist.deleteMissionInstance(instanceIdToDelete, function (err) {
            if (err) {
                logger.error(err);
                res.send(500);
            } else {
                logger.info('mission instance deleted: ' + instanceIdToDelete);
                res.send(204);
            }
        });
    });
}

function addLastinfoInfo(req: restify.Request, res: restify.Response, next: restify.Next) {
    var instanceIdToCleanup: string = req.params.id;
    if (!instanceIdToCleanup) {
        return res.send(400, 'missing instance id parameter');
    }
    persist.addLastinfoInfo(instanceIdToCleanup, function (err: Error, instanceId: string) {
        if (err) {
            return res.send(500);
        }
        logger.info('mission instance cleanup finished: ' + instanceIdToCleanup);
        return res.send(204);
    });
}

function unknownMethodHandler(req, res) {
    if (req.method.toLowerCase() === 'options') {
        var allowHeaders = [
            'authentication',
            'Accept', 'Accept-Version', 'Content-Type', 'Api-Version', 'Origin', 'X-Requested-With'
        ];

        res.methods.push('DELETE');
        res.methods.push('GET');

        if (res.methods.indexOf('OPTIONS') === -1) {
            res.methods.push('OPTIONS');
        }

        res.header('Access-Control-Allow-Credentials', true);
        res.header('Access-Control-Allow-Headers', allowHeaders.join(', '));
        res.header('Access-Control-Allow-Methods', res.methods.join(', '));
        res.header('Access-Control-Allow-Origin', req.headers.origin);

        return res.send(204);
    }
    else {
        return res.send(new restify.BadMethodError('method not allowed'));
    }
}

server.on('MethodNotAllowed', unknownMethodHandler);
server.use(function (req: restify.Request, res: restify.Response, next: restify.Next) {
    if (isInMaintenanceMode) {
        res.send(503);
    } else {
        next();
    }
});
server.use(function (req: restify.Request, res: restify.Response, next: restify.Next) {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    next();
});
server.get('/missions', returnAllMissions);
server.get('/currentMission', returnCurrentMission);
server.get('/currentMissions', returnCurrentMissions);
server.get('/mission/:id/changes', missionAuthentication, getMissionChanges);
server.get('/mission/:id', getMissionDetails);
server.del('/mission/:id', secretAuthentication, deleteMissionInstance);
server.post('/mission/:id/cleanup', secretAuthentication, addLastinfoInfo);