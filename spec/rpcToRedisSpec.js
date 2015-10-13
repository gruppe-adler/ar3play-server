var
    app = require(__dirname + '/../test.js'),
    Client = require(__dirname + '/../node_modules/sock-rpc/lib/client.js'),
    redis = require('redis'),
    async = require('async'),
    expect = require('chai').expect,
    config = require(__dirname + '/../lib/configuration.js'),
    redisKeys = require(__dirname + '/../lib/redisKeys.js'),
    setup = require(__dirname + '/fixtures/setupFunctions.js');

var doRpc = setup.doRpc;

var redisClient = redis.createClient(config.Redis.port, config.Redis.host);

var client = new Client({host: '::1', port: config.Rpc.ports[0]});

setup.setRedis(redisClient);
setup.setConfig(config);
setup.setRpcClient(client);

var parseResult = function (returnString) {
    return JSON.parse(returnString)[1];
};
var isResultError = function (returnString) {
    return JSON.parse(returnString)[0];
};
var clientId;

before(function (done) {
    async.waterfall([
        app.waitForApp,
        setup.flushDbAndResetApplicationState,
        setup.rpcConnect(function (newClientId) {
            clientId = newClientId;
        }),
        function () { done(); }
    ]);
});


describe('echo', function () {
    it('receives and echos hello', function (done) {
        doRpc('echo', ['huhu'], function (err, result) {
            expect(parseResult(result)).to.deep.equal(['huhu']);
            done();
        });
    });
});

describe('rpc module after mission start', function () {
    var instanceId;

    before(setup.getMissionStartAsBeforeFunction(
        'retro-something',
        'Sara',
        function (newInstanceId) { instanceId = newInstanceId}
    ));


    describe('missionStart method', function () {
        before(function (done) {
            redisClient.zrange('missions', 0, -1, function (err, result) {
                var instanceIdInRedis;
                if (err) {
                    throw err;
                }
                expect(result).to.be.an('array');
                expect(result.length).to.equal(1);
                instanceIdInRedis = result.pop();
                expect(instanceIdInRedis).not.to.be.a('undefined');
                expect(instanceIdInRedis).to.equal(instanceId);
                done();
            });
        });
        it('stores the mission metadat hash', function (done) {
            redisClient.hgetall(redisKeys.getMissionHASHKey(instanceId), function (err, result) {
                if (err) {
                    throw err;
                }
                expect(result).to.be.an('object');
                expect(result.name).to.equal('retro-something');
                expect(result.worldname).to.equal('Sara');
                done();
            });
        });
        it('stores the current mission per the client', function (done) {
            redisClient.get(redisKeys.getCurrentMissionSTRINGKey(clientId), function (err, result) {
                if (err) {
                    throw err;
                }

                expect(result).to.equal(instanceId);
                done();
            });
        });
    });
    describe('setAllUnitData method, with invalid data', function () {
        it('rejects calls with missing parameter', function (done) {
            doRpc('setAllUnitData', [], function (err, result) {
                expect(isResultError(result)).to.equal(true);
                expect(parseResult(result)).to.be.a('string');
                done();
            });
        });
    });
    describe('setAllUnitData method, with empty data', function () {
        it('accepts calls with empty data', function (done) {
            doRpc('setAllUnitData', [[]], function (err, result) {

                expect(parseResult(result)).to.equal(201);
                done();
            });
        });
    });
    describe('setAllUnitData method, with valid data', function () {
        before(function (done) {
            doRpc(
                'setAllUnitData', [
                    [
                        [1, 1545, 1554, 0, 45, 'GUER', 'alive', 'engineer', 'Fusselwurm', 3, []]
                    ]
                ],
                function (err, result) {
                    if (err) {
                        throw err;
                    }
                    expect(parseResult(result)).to.equal(201);
                    setTimeout(done, 50);
                }
            );

        });
        it('puts unit data point into redis', function (done) {
            var pattern = redisKeys.getUnitSTRINGKeyPattern(instanceId);
            redisClient.keys(pattern, function (err, result) {
                if (err) {
                    throw err;
                }
                expect(result).to.be.an('array');
                expect(result.length).to.equal(1);

                redisClient.get(result, function (err, result) {
                    expect(!!result).to.equal(true);
                    expect(JSON.parse(result)).to.deep.equal({
                        "id":1,
                        "position": [1545,1554,0],
                        "direction":45,
                        "side":"GUER",
                        "health":"alive",
                        "icon":"engineer",
                        "name":"Fusselwurm",
                        "container":3,
                        "content":[]
                    }
                    );
                    done();
                });
            });
        });
        it('creates a "created" entry for the unit', function (done) {
            redisClient.zrange(redisKeys.getCreationsZSETKey(instanceId), 0, -1, function (err, result) {
                expect(result).deep.equal(['1']);
                done();
            });
        });
    });
});
