const fs = require('fs');
const path = require('path');
const _latLng = require('./node_modules/node-hgt/src/latlng');
const tileKey = require('./node_modules/node-hgt/src/tile-key');
const Hgt = require('./node_modules/node-hgt/src/hgt');

function loadTile(tileDir, latLng) {
    const ll = {
        lat: Math.floor(latLng.lat),
        lng: Math.floor(latLng.lng)
    }
    const key = tileKey(ll);
    const tilePath = path.join(tileDir, key + '.hgt');

    const tileExists = fs.existsSync(tilePath);
    if (!tileExists) return [{message: 'Tile does not exist: ' + tilePath}]

    try {
        const tile = new Hgt(tilePath, ll);
        return [undefined, tile];
    } catch(e) {
        return [{message: 'Unable to load tile "' + tilePath + '": ' + e, stack: e.stack}];
    }
}

function TileSet(tileDir) {
    this._tileDir = tileDir;
}

TileSet.prototype.destroy = function() {};

TileSet.prototype.getElevation = function(latLng, cb) {
    const ll = _latLng(latLng);
    const [error, tile] = loadTile(this._tileDir, ll);

    if (error) return cb(error);
    const elevation = tile.getElevation(ll)
    if (isNaN(elevation)) return cb(elevation);
    cb(undefined, elevation);
};

module.exports = TileSet;

