var spawn = require('child_process').spawn;
var gulp = require('gulp');
var tsd = require('gulp-tsd');
var typescript = require('gulp-tsc');

gulp.task('default', ['app'], function () {
  
});

gulp.task('app', ['tsc'], function (cb) {
  // launch app
  var process = spawn('node', ['main.js'], {
      stdio: 'inherit'
  });
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
