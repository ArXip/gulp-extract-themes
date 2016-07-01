var _ = require('lodash'),
    through = require('through2'),
    gUtil = require('gulp-util'),
    pluginName = 'gulp-extract-themes',
    glob = require("globule"),
    Concat = require('concat-with-sourcemaps'),
    vinylSourcemapsApply = require('vinyl-sourcemaps-apply');

/**
 * @example
 *  {
 *    themes: [
 *      'themeName'
 *    ],
 *    themeSource: '**\/*.[theme].*css',
 *    themeChunk: '[theme].css',
 *    commonChunk: 'common.css',
 *    selectorPrefix: '.prefixed-with-[theme]-name'
 *  }
 */
module.exports = function(opt) {
    opt = opt || {};
    if (!_.isPlainObject(opt)) {
        throw new gUtil.PluginError(pluginName, 'First argument must be an object')
    }
    if (!_.isArray(opt.themes)) {
        throw new gUtil.PluginError(pluginName, 'Themes must be an array of themes names')
    }
    if (!_.isString(opt.themeSource)) {
        throw new gUtil.PluginError(pluginName, 'themeChunk must be a string of theme file name pattern')
    }
    if (!_.isString(opt.themeChunk)) {
        throw new gUtil.PluginError(pluginName, 'themeChunk must be a string of theme file name pattern')
    }

    var fileGlobs = {}
    opt.themes.forEach(function(theme) {
        return fileGlobs[theme] = opt.themeSource.replace('[theme]', theme)
    })

    if( opt.selectorPrefix ) {
        opt.selectorPrefix = opt.selectorPrefix.trim()
    }

    var themesFiles = {},
        foundSourceMap = false,
        encoding = 'utf8'

    function injectSelectorPrefix(contents, theme) {
        var prefix = opt.selectorPrefix.replace('[theme]', theme)

        return Buffer.from(
            contents
            .toString( encoding )
            .replace(
                /(\s*)([^\r\n,{}]+)\s*(,(?=[^}]*{)|\s*{)/g,
                function( match, indent, selector, beforeDeclarations ) {
                    if( selector[0] === '@' || selector[0] === '/' )
                        return indent + selector + beforeDeclarations

                    return indent + prefix + ' ' + selector + beforeDeclarations
                }
            ),
            encoding
        )
    }

    function concatBuffersOnly(files, theme) {
        files = files.map( function( file ) {
            return file.contents
        } )

        var isCommon = theme === 'common',
            willInjectSelector = opt.selectorPrefix && !isCommon

        return new gUtil.File({
            cwd: '',
            base: '',
            path: isCommon ?
                opt.commonChunk
            :
                opt.themeChunk.replace('[theme]', theme),
            contents: willInjectSelector ?
                injectSelectorPrefix(Buffer.concat(files), theme)
            :
                Buffer.concat(files)
        });
    }

    function concatWithSourceMap(files, theme) {
        var isCommon = theme === 'common',
            willInjectSelector = opt.selectorPrefix && !isCommon
            filename = isCommon ?
                opt.commonChunk
            :
                opt.themeChunk.replace('[theme]', theme),
            sourceStream = new Concat( true, filename, opt.newLine || '\n' )

        for (var i = 0; i < files.length; i++) {
            if( willInjectSelector ) {
                files[i].contents = injectSelectorPrefix(files[i].contents, theme)
            }

            sourceStream.add(
                files[i].relative,
                files[i].contents,
                files[i].sourceMap
            )
        }

        var outFile = new gUtil.File({
            cwd: "",
            base: "",
            path: filename,
            contents: sourceStream.content
        })

        vinylSourcemapsApply(
            outFile,
            sourceStream.sourceMap
        )
        return outFile;
    }

    function addContent(theme, file) {
        if (!themesFiles[theme]) {
            themesFiles[theme] = [];
        }

        if (file.sourceMap) {
          foundSourceMap = true;
        }

        themesFiles[theme].push(file);
    }

    return through.obj(
        function(file, enc, cb) {
            enc && (encoding = enc)

            var isThemeFile = _.some(fileGlobs, function(fileglob, theme) {
                if( file.cwd ) {
                    var path = file.path.substring(file.cwd.length + 1)
                } else {
                    var path = file.path
                }

                if( glob.match( fileglob, path ).length ) {
                    addContent(theme, file)
                    return true;
                }

                return false;
            })

            if (!isThemeFile && opt.commonChunk) {
                addContent('common', file)
            }

            //save the files until they're done streaming/buffering
            cb()
        },
        function(cb) {
            var self = this

            //once they're done giving us files, we give them the concatenated results
            _.each(themesFiles, function(files, theme) {
                if( foundSourceMap ) {
                    self.push( concatWithSourceMap(files, theme) )
                } else {
                    self.push( concatBuffersOnly(files, theme) )
                }
            })

            cb()
        }
    )
}
