require('typescript-require');

import redis = require('redis');
import http = require('http');
import rpc = require('./lib/rpc');
import persist = require('./lib/persist');
import dummyData = require('./lib/dummyData');

function returnCurrentMission(res: http.ServerResponse) {
    persist.getIsStreamable(function (error: Error, isStreamable: boolean) {
        var result = null;
        console.log('error ' + error + ', is streamable: ' + isStreamable);
        if (!error) {
            res.statusCode = 200;
            if (isStreamable) {
                result = persist.getAllLivePlayerData();
            } else {
                res.statusCode = 403;
            }
        } else {
            console.log(error);
            throw error;
        }

        res.end(JSON.stringify(result));
    });
}

function returnAllMissions(res: http.ServerResponse) {
    persist.getAllMissions(function (error: Error, missions: Array<string>) {
        res.end(JSON.stringify(missions));
    });
}

function returnMission(res: http.ServerResponse, url: string) {

}

http.createServer(function (req: http.ServerRequest, res: http.ServerResponse) {
    var path = req.url;
    console.log(path);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 500;
    // intercept OPTIONS method
    if ('GET' === req.method) {
        switch (path) {
            case '/current': returnCurrentMission(res); return;
            case '/missions': returnAllMissions(res); return;
            default:
                if (path.indexOf('/mission/') === 0) {
                    returnMission(res, path);
                    return;

                }

                res.statusCode = 400;
                res.end(path);
                return;
        }
    } else if (req.method === 'OPTIONS') {
        res.statusCode = 200;
    } else {
        res.statusCode = 405;
    }

    res.end('');

}).listen(12302);
console.log('starting to listen at 12302');

rpc.init();
dummyData.init();
