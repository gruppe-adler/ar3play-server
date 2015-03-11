require('typescript-require');
var http = require('http');
var rpc = require('./lib/rpc');
var persist = require('./lib/persist');
var dummyData = require('./lib/dummyData');
function returnCurrentMission(res) {
    persist.getIsStreamable(function (error, isStreamable) {
        var result = null;
        console.log('error ' + error + ', is streamable: ' + isStreamable);
        if (!error) {
            res.statusCode = 200;
            if (isStreamable) {
                result = persist.getAllLivePlayerData();
            }
            else {
                res.statusCode = 403;
            }
        }
        else {
            console.log(error);
            throw error;
        }
        res.end(JSON.stringify(result));
    });
}
function returnAllMissions(res) {
    persist.getAllMissions(function (error, missions) {
        res.end(JSON.stringify(missions));
    });
}
function returnMission(res, url) {
}
http.createServer(function (req, res) {
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
            case '/current':
                returnCurrentMission(res);
                return;
            case '/missions':
                returnAllMissions(res);
                return;
            default:
                if (path.indexOf('/mission/') === 0) {
                    returnMission(res, path);
                    return;
                }
                res.statusCode = 400;
                res.end(path);
                return;
        }
    }
    else if (req.method === 'OPTIONS') {
        res.statusCode = 200;
    }
    else {
        res.statusCode = 405;
    }
    res.end('');
}).listen(12302);
console.log('starting to listen at 12302');
rpc.init();
dummyData.init();
//# sourceMappingURL=main.js.map