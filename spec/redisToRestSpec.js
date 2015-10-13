var
    app = require(__dirname + '/../test.js'),
    Client = require(__dirname + '/../node_modules/sock-rpc/lib/client.js'),
    redis = require('redis'),
    async = require('async'),
    config = require(__dirname + '/../lib/configuration.js'),

    frisby = require('icedfrisby'),
    endpoint = 'http://localhost:' + config.Webserver.port,
    fixtures = require(__dirname + '/fixtures/missionStartEtc.js');

var
    redisClient = redis.createClient(config.Redis.port, config.Redis.host),
    instanceId,
    clientId,
    doRpc = fixtures.doRpc;

var client = new Client({host: '::1', port: config.Rpc.ports[0]});
var parseResult = function (returnString) {
    return JSON.parse(returnString)[1];
};


fixtures.setRedis(redisClient);
fixtures.setConfig(config);
fixtures.setRpcClient(client);

function getMissionStartAsBeforeFunction(missionName, worldName, newInstanceIdCallback) {
    return function (done) {
        doRpc('missionStart', [missionName, worldName], function (err, result) {
            var newInstanceId = parseResult(result);
            expect(newInstanceId).to.be.a('string');
            expect(newInstanceId.length).to.be.above(6);
            newInstanceIdCallback(newInstanceId);
            done();
        });
    };
}

before(app.waitForApp);

before(function (done) {
    async.waterfall([
        fixtures.flushDbAndResetApplicationState,
        fixtures.fillRedis,
        fixtures.rpcConnect(function (newClientId) {
            clientId = newClientId;
        }),
        getMissionStartAsBeforeFunction('foo', 'Altis', function (newInstanceId) {
            instanceId = newInstanceId;
        }),
        function () { done(); }
    ]);
});

describe('get current mission(s)', function () {

    var f1 = frisby.create('getting current mission');
    f1.current.expects.push(function () { // slightly hacky way to defer frisby evaluating condition
        // TODO fix that shit and propose PR to allow to pass callbacks into frisby's expect methods
        expect(f1.current.response.body).to.equal(JSON.stringify(instanceId));
    });
    f1.get(endpoint + '/currentMission').
        expectStatus(200).
        toss();


    var f2 = frisby.create('getting current missions');
    f2.current.expects.push(function () {
        expect(f2.current.response.body).to.equal(JSON.stringify([instanceId]));
    });
    f2.get(endpoint + '/currentMissions').
    expectStatus(200).
    toss();
});
/*
describe('trigger cleanup', function () {

    frisby.
        create('cleanup without auth').
        post(function () { return endpoint + '/mission/' + instanceId + '/cleanup'}).
        expectStatus(401).
        toss();

    frisby.
        create('cleanup with auth').
        addHeader('Authentication', 's3cr3t').
        post(function () { return endpoint + '/mission/' + instanceId + '/cleanup'}).
        expectStatus(204).
        toss();
});
*/