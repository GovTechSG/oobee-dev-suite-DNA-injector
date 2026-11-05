import { relative } from 'path';

function getRelativePath(filePath, rootPath = process.cwd()) {
    return relative(rootPath, filePath);
}

function log(message, verbose = false) {
    if (verbose) {
        console.log(`[oobee-genome] ${message}`);
    }
}

export {
    getRelativePath,
    log
};
