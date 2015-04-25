var spawn = require('child_process').spawn;
var gulp = require('gulp');
var fs = require('fs');
var tsd = require('gulp-tsd');
var typescript = require('gulp-tsc');
var config = JSON.parse(fs.readFileSync(__dirname + '/config.json'));
var pidfileName = config.pidfile || __dirname + '/pidfileName';
var logfileName = config.logfile;

gulp.task('default', ['app'], function () {

});

gulp.task('app', ['tsc'], function (cb) {
    var
        options = {},
        logStream,
        process;


    function writeLog(chunk) {
        logStream.write(chunk);
    }

    if (!logfileName) {
        options.stdio = 'inherit';
    }

    process = spawn('node', ['main.js'], options);


    fs.writeFileSync(pidfileName, process.pid);
    if (logfileName) {
        logStream = fs.createWriteStream(logfileName);
        process.stdout.on('data', writeLog);
        process.stderr.on('data', writeLog);
    }
});

gulp.task('tsc', ['tsd'], function () {
    return gulp.src(['main.ts'])
        .pipe(typescript())
        .pipe(gulp.dest('.'))
});

gulp.task('tsd', function (callback) {
    tsd({
        command: 'reinstall',
        config: './tsd.json'
    }, callback);
});

gulp.task('stop', function (cb) {
    var pid = fs.readFileSync(pidfileName);
    if (pid) {
        console.log('killing ' + pid);
        process.kill(pid);
        fs.unlink(pidfileName);
    }
});
