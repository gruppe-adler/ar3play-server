var exec = require('child_process').exec;
var gulp = require('gulp');
var tsd = require('gulp-tsd');
var typescript = require('gulp-tsc');

gulp.task('default', ['app'], function () {
  
});

gulp.task('app', ['tsc'], function (cb) {
  // launch app
  exec('node main.js', function(err) {
    if (err) return cb(err); // return error
    cb(); // finished task
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
