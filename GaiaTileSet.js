const fs = require('fs');
const path = require('path');
const LRU = require('lru-cache');
const _latLng = require('./node_modules/node-hgt/src/latlng');
const tileKey = require('./node_modules/node-hgt/src/tile-key');
const Hgt = require('./node_modules/node-hgt/src/hgt');

function TileSet(tileDir, NO_DATA = 0) {
    this._tileDir = tileDir;
    this._cache = new LRU({
        // 500mb
        max: 500000000,
        // 30 days
        maxAge: 1000 * 60 * 60 * 24 * 30,
        length: n => n._buffer.length,
        updateAgeOnGet: true,
    });
    this._NO_DATA = NO_DATA;
}

TileSet.prototype.destroy = function() {};

TileSet.prototype._loadTile = function(tileDir, latLng) {
    const ll = {
        lat: Math.floor(latLng.lat),
        lng: Math.floor(latLng.lng)
    }
    const key = tileKey(ll);
    const tilePath = path.join(tileDir, key + '.hgt');

    const cachedTile = this._cache.get(key);
    if (cachedTile) return [undefined, cachedTile];

    const tileExists = fs.existsSync(tilePath);
    if (!tileExists) return [{message: 'Tile does not exist: ' + tilePath}]

    try {
        const tile = new Hgt(tilePath, ll);
        this._cache.set(key, tile);
        return [undefined, tile];
    } catch(e) {
        return [{message: 'Unable to load tile "' + tilePath + '": ' + e, stack: e.stack}];
    }
}

TileSet.prototype.getElevation = function(latLng) {
    const ll = _latLng(latLng);
    const [error, tile] = this._loadTile(this._tileDir, ll);

    if (error) return [error, this._NO_DATA];
    const elevation = tile.getElevation(ll)
    if (isNaN(elevation)) return [elevation, this._NO_DATA];
    return [undefined, elevation || this._NO_DATA];
};

module.exports = TileSet;

