/**
 * @author Leon Wong
 */

/** 此处配置是否为开发环境 **/
var isProductions = false;

var pkg = require('./package.json');
var dirs = pkg['h5bp-configs'].directories;

var fs = require('fs');
var path = require('path');

var gulp = require('gulp');

// Load all gulp plugins automatically
// and attach them to the `plugins` object
var plugins = require('gulp-load-plugins')();

// Temporary solution until gulp 4
// https://github.com/gulpjs/gulp/issues/355
var runSequence = require('run-sequence');

//压缩合并一套件
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');
var cssshrink = require('gulp-cssshrink');
var rename = require('gulp-rename');
var webpack = require('webpack-stream');
// 版本号生成一套件
var rev = require('gulp-rev');
var revCollector = require('gulp-rev-collector');

var config = require('./webpack.config');

/**
 * 动态指定publicPath
 */
var publicPathRef = config.output.publishRef;
config.output.publicPath = config.output.publicPathConfig[publicPathRef];

// ---------------------------------------------------------------------
// | Helper tasks                                                      |
// ---------------------------------------------------------------------
/**
 * 清理资源目录
 */
gulp.task('clean', function (done) {
    require('del')([
        dirs.dist + '/cn/*',
        dirs.assets,
        dirs.resource + '/js/*',
        dirs.resource + '/css/*',
        dirs.resource + '/images/*',
        dirs.resource + '/assets/*'
    ], done);
});

/**
 * 语法检查
 */
gulp.task('lint:js', function () {
    return gulp.src([
        'gulpfile.js',
        dirs.src + '/js/*.js',
        dirs.test + '/*.js'
    ]).pipe(plugins.jscs())
        .pipe(plugins.jshint())
        .pipe(plugins.jshint.reporter('jshint-stylish'))
        .pipe(plugins.jshint.reporter('fail'));
});


/**
 * (生产模式/开发模式)
 * 将所有入口js，即命名为entry/*.main.js编译到统一目录
 */
gulp.task('webpack:js', function () {
    return gulp.src('')
        .pipe(webpack(config))
        .pipe(gulp.dest(dirs.assets));
});

/**
 * (生产模式/开发模式)
 * 发布图片
 */
gulp.task('webpack publish:images', function () {
    gulp.src(dirs.src + '/images/*')
        .pipe(gulp.dest(dirs.resource + '/images'));
    gulp.src(dirs.src + '/css/images/')
        .pipe(gulp.dest(dirs.resource + '/css/images'))
});

/**
 * (开发模式)
 * 将webpack模块化打包的js直接放入工程文件夹内
 */
gulp.task('webpack copy:js', function () {
    return gulp.src(dirs.assets + '/*_*.all.js')
        .pipe(gulp.dest(dirs.resource + '/js'));
});

/**
 * (开发模式)
 * 发布公共模块，包括公共图片引用，如jQuery
 */
gulp.task('webpack copy module:js', function () {
    gulp.src(dirs.assets + '/*.*.all.js')
        .pipe(gulp.dest(dirs.resource + '/assets'));
    gulp.src(dirs.assets + '/*.?(png|jpg|jpeg)')
        .pipe(gulp.dest(dirs.resource + '/assets'));
});

/**
 * (开发模式)
 * 将webpack模块化打包的css直接放入工程文件夹内
 */
gulp.task('webpack copy:css', function () {
    return gulp.src(dirs.assets + '/*.css')
        .pipe(gulp.dest(dirs.resource + '/css'));
});

/**
 * (开发模式)
 * 将webpack模块化打包的ftl直接放入工程文件夹内
 */
gulp.task('webpack copy:ftl', function () {
    return gulp.src(dirs.src + '/ftl/*/*.ftl')
        .pipe(gulp.dest(dirs.dist + '/cn'));
});

/**
 * (生产模式)
 * 将webpack模块化打包（并压缩）的js直接放入工程文件夹内
 */
gulp.task('webpack publish:js', function () {
    return gulp.src(dirs.assets + '/*_*.all.js')
        .pipe(uglify())
        .pipe(rev())
        .pipe(gulp.dest(dirs.resource + '/js'))
        .pipe(rev.manifest())
        .pipe(gulp.dest(dirs.resource + '/js/rev'));
});

/**
 * (生产模式)
 * 将webpack模块化打包并压缩的css直接放入工程文件夹内
 */
gulp.task('webpack publish:css', function () {
    return gulp.src(dirs.assets + '/*_*.css')
        .pipe(cssshrink())
        .pipe(rev())
        .pipe(gulp.dest(dirs.resource + '/css'))
        .pipe(rev.manifest())
        .pipe(gulp.dest(dirs.resource + '/css/rev'));
});

/**
 * (生产模式)
 * 发布公共模块，包括公共图片引用，如jQuery
 */
gulp.task('webpack publish module:js', function () {
    gulp.src(dirs.assets + '/*.*.all.js')
        .pipe(uglify())
        .pipe(gulp.dest(dirs.resource + "/assets"));
    gulp.src(dirs.assets + '/*.?(png|jpg|jpeg)')
        .pipe(gulp.dest(dirs.resource + '/assets'));
});

/**
 * (生产模式)
 * 根据生成的rev-json作为替换规则在源html/ftl页面进行替换
 */
gulp.task('webpack publish rev:ftl', function () {
    return gulp.src([dirs.resource + '/*/rev/*.json', dirs.src + '/ftl/*/*.ftl'])
        .pipe(revCollector({
            replaceReved: true
        }))
        .pipe(gulp.dest(dirs.dist + '/cn'));
});

// ---------------------------------------------------------------------
// | custom tasks   WATCHING !!! 可根据自己需求定义watch                 |
// ---------------------------------------------------------------------

gulp.task('watch :production', function () {
    gulp.watch(dirs.src + '/css/*/*.css', ['publish build']);
    gulp.watch(dirs.src + '/js/*/*.js', ['publish build']);
    gulp.watch(dirs.src + '/ftl/*/entry/*.js', ['publish build']);
    gulp.watch(dirs.src + '/ftl/*/*.ftl', ['publish build']);
    gulp.watch(dirs.src + '/images/*', ['publish build']);
});

gulp.task('watch :dev', function () {
    gulp.watch(dirs.src + '/css/*/*.css', ['publish build dev']);
    gulp.watch(dirs.src + '/js/*/*.js', ['publish build dev']);
    gulp.watch(dirs.src + '/ftl/*/entry/*.js', ['publish build dev']);
    gulp.watch(dirs.src + '/ftl/*/*.ftl', ['publish build dev']);
    gulp.watch(dirs.src + '/images/*', ['publish build']);
});


// ---------------------------------------------------------------------
// | Main tasks                                                        |
// ---------------------------------------------------------------------


var mainTask = isProductions ? ['publish build'] : ['publish build dev'];

gulp.task('default', mainTask);

/**
 * 生产模式 JS、CSS资源和ftl资源发布
 */
gulp.task('publish build', function (done) {
    runSequence(
        'clean',
        'webpack:js',
        ['webpack publish:js', 'webpack publish module:js', 'webpack publish:css', 'webpack publish:images'],
        'webpack publish rev:ftl',
        done);
});

/**
 * 开发环境 JS、CSS资源和ftl资源发布
 */
gulp.task('publish build dev', function (done) {
    runSequence(
        'clean',
        'webpack:js',
        ['webpack copy:js','webpack copy module:js','webpack copy:css', 'webpack copy:ftl', 'webpack publish:images'],
        done);
});
