require('typescript-require');
var rpc = require('./lib/rpc');
var dummyData = require('./lib/dummyData');
var bunyan = require('bunyan');
var webserver = require('./lib/webserver');
var logger = bunyan.createLogger({ name: __filename.split('/').pop() });
rpc.init(5555);
webserver.init(12302);
if (true) {
    dummyData.init();
}
logger.info('ready.');
//# sourceMappingURL=main.js.map