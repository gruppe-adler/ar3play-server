var spawn = require('child_process').spawn;
var gulp = require('gulp');
var fs = require('fs');
var tsd = require('gulp-tsd');
var typescript = require('gulp-tsc');
var pidfile = __dirname + '/pidfile';

gulp.task('default', ['app'], function () {
  
});

gulp.task('app', ['tsc'], function (cb) {
  // launch app
  var process = spawn('node', ['main.js'], {
      stdio: 'inherit'
  });
  fs.writeFileSync(pidfile, process.pid);
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
    var pid = fs.readFileSync(pidfile);
    if (pid) {
        console.log('killing ' + pid);
        process.kill(pid);
        fs.unlink(pidfile);
    }
});