const path = require('path');
const { VERSION } = require('../config');

const ROOT_DIR = path.resolve(__dirname, '../..');

const versionDir = path.join(ROOT_DIR, 'versions', VERSION);
const viewsDir = path.join(versionDir, 'views');
const publicDir = path.join(versionDir, 'public');
const dataDir = path.join(versionDir, 'data');

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
