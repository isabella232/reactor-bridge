'use strict';

var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var minifyCSS = require('gulp-minify-css');
var path = require('path');
var webpack = require('webpack-stream');
var eventStream = require('event-stream');

module.exports = function(gulp) {
  gulp.task("windgoggles:buildIframeUtilsJS", function() {
    var paths = [
      require.resolve('iframe-resizer/js/iframeResizer.contentWindow'),
      require.resolve('frameboyant/frameboyant.contentWindow'),
      require.resolve('coralui/build/js/libs/jquery'),
      require.resolve('coralui/build/js/libs/moment'),
      require.resolve('coralui/build/js/coral')
    ];

    var sourceStream = gulp.src(paths);
    var extensionBridgeStream = gulp
      .src(['src/extensionBridge.contentWindow.js'])
      .pipe(webpack({
        module: {
          loaders: [{ test: /\.json$/, loader: "json" }]
        }
      }));

    return eventStream.merge(sourceStream, extensionBridgeStream)
      .pipe(concat("iframeutils.min.js"))
      .pipe(uglify())
      .pipe(gulp.dest(path.join(__dirname, '../dist/js')));
  });

  gulp.task("windgoggles:buildIframeUtilsCSS", function() {
    var coralUiPath = path.dirname(require.resolve('coralui/build/js/coral'));
    var paths = [
      path.join(coralUiPath, '..', 'css', 'coral.min.css')
    ];

    var srcStream = gulp.src(paths);

    return srcStream
      .pipe(minifyCSS())
      .pipe(concat("iframeutils.min.css"))
      .pipe(gulp.dest(path.join(__dirname, '../dist/css')));
  });

  gulp.task("windgoggles:copyIframeUtilsResources", function() {
    var coralUiPath = path.dirname(require.resolve('coralui/build/js/coral'));
    return gulp.src([path.join(coralUiPath, '..', 'resources', '**/*')])
      .pipe(gulp.dest(path.join(__dirname, '../dist/resources')));
  });

  gulp.task('windgoggles:buildIframeUtils', [
    'windgoggles:buildIframeUtilsCSS',
    'windgoggles:buildIframeUtilsJS',
    'windgoggles:copyIframeUtilsResources'
  ]);
};