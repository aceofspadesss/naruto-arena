const path = require('path');
const { VERSION } = require('../config');

const ROOT_DIR = path.resolve(__dirname, '../..');

let viewsDir, publicDir, dataDir;

if (VERSION === 'default') {
    viewsDir = path.join(ROOT_DIR, 'views');
    publicDir = path.join(ROOT_DIR, 'public');
    dataDir = path.join(ROOT_DIR, 'data');
} else {
    const versionDir = path.join(ROOT_DIR, 'versions', VERSION);
    viewsDir = path.join(versionDir, 'views');
    publicDir = path.join(versionDir, 'public');
    dataDir = path.join(versionDir, 'data');
}

function publicPath(...segments) {
    return path.join(publicDir, ...segments);
}

function dataPath(...segments) {
    return path.join(dataDir, ...segments);
}

module.exports = {
    viewsDir,
    publicDir,
    dataDir,
    publicPath,
    dataPath,
};
