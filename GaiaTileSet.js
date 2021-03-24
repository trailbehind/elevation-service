const fs = require('fs');
const path = require('path');
const LRU = require('lru-cache');
const _latLng = require('./hgt/latlng');
const {format} = require('util')

const HGT = require('./hgt');
const getHGTElevation = require('./hgt/getHGTElevation');

function GaiaTileSet(tileDir, NO_DATA = 0) {
    this._tileDir = tileDir;
    this._cache = new LRU({
        // 500mb
        max: 500000000,
        // 12 hours
        maxAge: 1000 * 60 * 60 * 12,
        length: n => n.buffer.length,
        updateAgeOnGet: true,
        dispose: (key, value) => {
            // pass
        }
    });
    this._NO_DATA = NO_DATA;
}

GaiaTileSet.prototype.destroy = function() {
    this._cache.reset();
};

GaiaTileSet.prototype._loadTile = function(tileDir, latLng, callback) {
    const ll = {
        lat: Math.floor(latLng.lat),
        lng: Math.floor(latLng.lng)
    }
    const key = getTileKey(ll);
    const cachedTile = this._cache.get(key);
    if (cachedTile) return callback(undefined, cachedTile);

    const tilePath = path.join(tileDir, key + '.hgt');
    try {
        HGT(tilePath, ll, undefined, (error, tile) => {
            setImmediate(() => {
                if (error) return callback([{message: 'Tile does not exist'}])
                this._cache.set(key, tile);
                callback(undefined, tile);
            })
        })
    } catch(e) {
        callback({message: 'Unable to load tile "' + tilePath + '": ' + e, stack: e.stack});
    }
}

GaiaTileSet.prototype.getElevation = function(latLng, callback) {
    const ll = _latLng(latLng);
    this._loadTile(this._tileDir, ll, (error, tile) => {
        setImmediate(() => {
            if (error) return callback(error, this._NO_DATA)

            const elevation = getHGTElevation(tile, ll);
            if (isNaN(elevation)) return callback(elevation, this._NO_DATA);
            return callback(undefined, elevation || this._NO_DATA);
        })
    })
};


// via https://github.com/perliedman/node-hgt/blob/master/src/tile-key.js
function zeroPad(v, l) {
    var r = v.toString();
    while (r.length < l) {
        r = '0' + r;
    }
    return r;
}
function getTileKey(latLng) {
    return format('%s%s%s%s',
        latLng.lat < 0 ? 'S' : 'N',
        zeroPad(Math.abs(Math.floor(latLng.lat)), 2),
        latLng.lng < 0 ? 'W' : 'E',
        zeroPad(Math.abs(Math.floor(latLng.lng)), 3)
    );
}

module.exports = GaiaTileSet;
