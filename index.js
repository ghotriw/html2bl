var htmlparser = require("htmlparser2"),
    fs = require("fs"),
    path = require("path"),
    vow = require('vow'),
    promisify = require('vow-node').promisify,
    classes = [],
    stat = promisify(fs.stat);

/**
 * Returns unique CSS class names from html string in source file order.
 * @param {string} html
 * @returns {string[]} class names
 */
function getClasses(htmlSrc) {
    for(var index in htmlSrc) {
        var html = fs.readFileSync(htmlSrc[index], 'utf8');
        var parser = new htmlparser.Parser({
            onopentag: function(name, attribs){
                if(attribs.class){
                    attribs.class.split(' ').forEach(function(className) {
                        (classes.indexOf(className) === -1) && classes.push(className);
                    });
                }
            }
        }, {decodeEntities: true});
        parser.write(html);
        parser.end();
    }

    return classes;

}

/**
 * Returns file names from CSS classes with redifinition levels on fs.
 * @param {string[]} blocks
 * @param {string[]} levels
 * @returns {string[]}
 */
function getFilesFromBlocks(blocks, levels) {
    var scssFiles = [],
        blockDirs = [];

    return vow.all(levels.map(function(level) {
        return vow.allResolved(blocks.map(function(blockName) {
            var dirName = path.resolve('./' + level + '/' + blockName + '/');
            return stat(dirName).then(function (stats) {
                if (stats.isDirectory()) {
                    blockDirs.push(dirName);
                    var fileName = path.resolve(dirName + '/' + blockName + '.scss');
                }
                if (fs.statSync(fileName).isFile()) {
                    scssFiles.push(fileName);
                }
                return stats;
            });
        }));
    })).then(function() {
        return { scss: scssFiles, dirs: blockDirs };
    });
}

/**
 * Returns promise with block directories from html file.
 * Looking on current file tree with redifinition levels.
 * @param {Object} params
 * @param {string} params.htmlSrc html file name for parsing
 * @param {(string|string[])} params.levels — redefinition levels
 *
 */
exports.getFileNames = function(params) {
    var blocks = getClasses(params.htmlSrc);

    return getFilesFromBlocks(blocks, params.levels).then(function(files) {
        return files;
    });
};
