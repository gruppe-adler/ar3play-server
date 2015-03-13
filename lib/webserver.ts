/// <reference path="./../typings/tsd.d.ts" />

import restify = require('restify');
import bunyan = require('bunyan');
import persist = require('./persist');
import PlayerInfo = require('./PlayerInfo');

var
    logger = bunyan.createLogger({name: __filename.split('/').pop()}),
    server = restify.createServer({log: bunyan.createLogger({name: 'restify'})});

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

export function init(port: number): void {
    server.listen(port);
    logger.info('HTTP server listening on ' + port);

    server.on('uncaughtException', function (req: restify.Request, res: restify.Response, route, err: Error) {
        logger.error(err);
    });
}

function returnAllMissions(req: restify.Request, res: restify.Response) {
    persist.getAllMissions(function (error: Error, missions: Array<string>) {
        res.send(missions);
    });
}

function returnCurrentMission(req: restify.Request, res: restify.Response) {
    res.send(200, JSON.stringify(persist.getAllLivePlayerData()));
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
        nakedQuery = req.query(),
        query = typeof nakedQuery === 'string' ? parseQuery(nakedQuery) : nakedQuery,
        from = query.from && parseInt(query.from, 10),
        to = query.to && parseInt(query.to, 10);

    if (!req.params.id) {
        throw new Error('i did something very wrong');
    }

    if (!(from && to)) {
        logger.warn('no from and to: ' + from + ' ' + to + ' query ' + nakedQuery);
        return res.send(400, 'need from and to parameters, both being timestamps');
    }

    if (to - from < 1 || to - from > 100) {
        return res.send(400, 'interval must be 0<interval<100 seconds');
    }

    persist.getMissionChanges(req.params.id, from, to, function (error: Error, data: HashMap<string, PlayerInfo.PlayerInfo>) {
        var result = {};
        if (error) {
            logger.error(error);
        }

        if (data) {
            data.forEach(function (info: PlayerInfo.PlayerInfo, name: string) {
                result[name] = info
            });
        }

        res.send(error ? 500 : 200, result);
    });
}

function missionAuthentication(req: restify.Request, res: restify.Response, next: restify.Next) {
    persist.getCurrentMission(function (error: Error, missionInstanceName: string) {
        if (req.params.id && (missionInstanceName !== req.params.id)) { // catch current mission
            return next();
        }

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
    });
}
/*
function setMissionId(req: restify.Request, res: restify.Response, next: restify.Next) {
    if (req.params.id) {
        return next();
    }

    persist.getCurrentMission(function (error: Error, missionId: string) {
        if (error) {
            logger.error(error);
            return res.send(500, 'couldnt current mission');
        }

        req.params.id = missionId;
        next();
    });
}
*/

function sendCorsHeaders(req: restify.Request, res: restify.Response, next: restify.Next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    next();
}

server.use(sendCorsHeaders);
server.get('/missions', returnAllMissions);
server.get('/currentMission', missionAuthentication, returnCurrentMission);
server.get('/mission/:id/changes', missionAuthentication, getMissionChanges);
server.get('/mission/:id', missionAuthentication, getMissionDetails);
