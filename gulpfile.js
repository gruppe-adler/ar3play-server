var spawn = require('child_process').spawn;
var gulp = require('gulp');
var fs = require('fs');
var tsd = require('gulp-tsd');
var typescript = require('gulp-tsc');
var mocha = require('gulp-mocha');
var config = JSON.parse(fs.readFileSync(__dirname + '/config.json'));
var pidfileName = config.pidfile || __dirname + '/pidfile';

gulp.task('default', ['app'], function () {

});

gulp.task('app', ['tsc'], function (cb) {
    var
        process;

    process = spawn('node', ['main.js'], {stdio: 'inherit'});
    fs.writeFileSync(pidfileName, process.pid);
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

gulp.task('stop', function () {
    var pid = fs.readFileSync(pidfileName);
    if (pid) {
        console.log('killing ' + pid);
        process.kill(pid);
        fs.unlink(pidfileName);
    }
});

gulp.task('mocha', ['tsc'], function () {
    return gulp.src(__dirname + '/spec/*.js').
        pipe(mocha({reporter: 'nyan'})).
        once('error', function () { process.exit(1); }).
        once('end', function () { process.exit(); });
});
