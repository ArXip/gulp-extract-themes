var _ = require('lodash'),
  gulp = require('gulp'),
  expect = require('chai').expect,
  gUtil = require('gulp-util'),
  extractThemes = require('../.'),
  buffer = require('vinyl-buffer'),
  sourcemaps = require('gulp-sourcemaps')

var CSS_COMMENTS = [
  'first css file',
  'second css file',
  'third css file'
]

function tests(withBuffer) {

  it('no matches', function (done) {
    gulp.src('./test/fixtures/*.css')
      .pipe(withBuffer ? buffer() : gUtil.noop())
      .pipe(extractThemes({
        themes: [],
        themeSource: '**/*',
        themeChunk: '[theme].css',
        commonChunk: 'common.css'
      }))
      .pipe(gUtil.buffer(function (err, files) {
        expect(files).to.have.length(1);
        expect(files[0].basename).to.equal('common.css');
        done();
      }))
  });

  it('multi-match with single theme and commons', function (done) {
    gulp.src('./test/fixtures/*.css')
      .pipe(withBuffer ? buffer() : gUtil.noop())
      .pipe(extractThemes({
        themes: [
          'Css1'
        ],
        themeSource: '**/*[theme].css',
        themeChunk: '[theme].css',
        commonChunk: 'common.css'
      }))
      .pipe(gUtil.buffer(function (err, files) {
        var filenames = files.map( function( file ) {
          return file.basename
        } )
        expect(files).to.have.length(2);
        expect(filenames).to.include('common.css');
        expect(filenames).to.include('Css1.css');
        done();
      }))
  });

  it('multi-match with single theme and commons with source-maps', function (done) {
    gulp.src('./test/fixtures/*.css')
      .pipe(withBuffer ? buffer() : gUtil.noop())
      .pipe(sourcemaps.init())
      .pipe(extractThemes({
        themes: [
          'Css1'
        ],
        themeSource: '**/*[theme].css',
        themeChunk: '[theme].css',
        commonChunk: 'common.css'
      }))
      .pipe(sourcemaps.write('.'))
      .pipe(gUtil.buffer(function (err, files) {
        var filenames = files.map( function( file ) {
          return file.basename
        } )
        expect(files).to.have.length(4);
        expect(filenames).to.have.members([
          'Css1.css',
          'common.css',
          'Css1.css.map',
          'common.css.map'
        ]);
        done();
      }))
  });


  it('cant duplicate css content', function (done) {
    gulp.src('./test/fixtures/*.css')
      .pipe(withBuffer ? buffer() : gUtil.noop())
      .pipe(extractThemes({
        themes: [
          'Css1',
          'Css2'
        ],
        themeSource: '**/*[theme].css',
        themeChunk: '[theme].css',
        commonChunk: 'common.css'
      }))
      .pipe(gUtil.buffer(function (err, files) {
        expect(files).to.have.length(3);

        files.forEach(function (file) {
          var content = file.contents.toString()
          var commentsFound = CSS_COMMENTS.filter( function( cssComment ) {
            return ~content.indexOf( cssComment )
          } )

          expect(commentsFound).to.have.length(1);
        });
        done();
      }))
  });

  it('should inject custom selector', function (done) {
    gulp.src('./test/fixtures/*.css')
      .pipe(withBuffer ? buffer() : gUtil.noop())
      .pipe(extractThemes({
        themes: [
          'Css1'
        ],
        themeSource: '**/*[theme].css',
        themeChunk: '[theme].css',
        selectorPrefix: '#greatPrefixWith_[theme]_name'
      }))
      .pipe(gUtil.buffer(function (err, files) {
        expect(files).to.have.length(1);
        expect(files[0].contents.toString()).to.contains('#greatPrefixWith_Css1_name .myOwnSelector');
        done();
      }))
  });

  it('should inject custom selector with source-maps', function (done) {
    gulp.src('./test/fixtures/*.css')
      .pipe(withBuffer ? buffer() : gUtil.noop())
      .pipe(sourcemaps.init())
      .pipe(extractThemes({
        themes: [
          'Css1'
        ],
        themeSource: '**/*[theme].css',
        themeChunk: '[theme].css',
        selectorPrefix: '#greatPrefixWith_[theme]_name'
      }))
      .pipe(sourcemaps.write('.'))
      .pipe(gUtil.buffer(function (err, files) {
        expect(files).to.have.length(2);
        expect(files[1].contents.toString()).to.contains('#greatPrefixWith_Css1_name .myOwnSelector')
        done();
      }))
  });

  it('should inject custom selector only in themes', function (done) {
    gulp.src('./test/fixtures/*.css')
      .pipe(withBuffer ? buffer() : gUtil.noop())
      .pipe(extractThemes({
        themes: [],
        themeSource: '**/*[theme].css',
        themeChunk: '[theme].css',
        commonChunk: 'common.css',
        selectorPrefix: '#greatPrefix'
      }))
      .pipe(gUtil.buffer(function (err, files) {
        expect(files).to.have.length(1);
        expect(files[0].contents.toString()).to.not.contains('#greatPrefix');
        done();
      }))
  });
}

describe('with buffers', function () {
  tests(true);
});

describe('without buffers', function () {
  tests(false);
});

describe('config failure', function () {
  it('throws on being given array', function (done) {
    expect(function () {
      gulp.src('./test/fixtures/*.css')
        .pipe(extractThemes(['**/*']))
        .pipe(gUtil.buffer(function (err, files) {
          done(err || files);
        }))
    }).to.throw();
    done();
  });

  it('throws when themes not specified', function (done) {
    expect(function () {
      gulp.src('./test/fixtures/*.css')
        .pipe(extractThemes({}))
        .pipe(gUtil.buffer(function (err, files) {
          done(err || files);
        }))
    }).to.throw();
    done();
  });

  it('throws when themeSource not specified', function (done) {
    expect(function () {
      gulp.src('./test/fixtures/*.css')
        .pipe(extractThemes({
          themes: []
        }))
        .pipe(gUtil.buffer(function (err, files) {
          done(err || files);
        }))
    }).to.throw();
    done();
  });

  it('throws when themeChunk not specified', function (done) {
    expect(function () {
      gulp.src('./test/fixtures/*.css')
        .pipe(extractThemes({
          themes: [],
          themeSource: '*'
        }))
        .pipe(gUtil.buffer(function (err, files) {
          done(err || files);
        }))
    }).to.throw();
    done();
  });

});
