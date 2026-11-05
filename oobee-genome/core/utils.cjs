const path = require('path');

function getRelativePath(filePath, rootPath = process.cwd()) {
    return path.relative(rootPath, filePath);
}

function log(message, verbose = false) {
    if (verbose) {
        console.log(`[oobee-genome] ${message}`);
    }
}

module.exports = {
    getRelativePath,
    log
};
