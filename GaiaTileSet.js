const path = require('path');
const LRU = require('lru-cache');
const {format} = require('util');
const {coordAll, coordEach} = require('@turf/meta');
const HGT = require('./hgt');
const getHGTElevation = require('./hgt/getHGTElevation');

function GaiaTileSet(tileDir, NO_DATA = 0) {
    this._tileDir = tileDir;
    this._cache = new LRU({
        // 500mb
        max: 500000000,
        // 30 days
        maxAge: 1000 * 60 * 60 * 24 * 30,
        length: (n) => n.buffer.length,
        updateAgeOnGet: true,
        dispose: (key, value) => {
            // pass
        },
    });
    this._NO_DATA = NO_DATA;
}

GaiaTileSet.prototype.destroy = function () {
    this._cache.reset();
};

// Get the appropriate HGT tile for a given coordinate
GaiaTileSet.prototype._loadTile = function (coord, callback) {
    coord = coord.map(Math.floor);

    const key = getTileKey(coord);
    const cachedTile = this._cache.get(key);
    if (cachedTile) return callback(undefined, cachedTile);

    const tilePath = path.join(this._tileDir, key + '.hgt');
    try {
        HGT(tilePath, coord, undefined, (error, tile) => {
            setImmediate(() => {
                if (error) return callback([{message: 'Tile does not exist'}]);
                this._cache.set(key, tile);
                callback(undefined, tile);
            });
        });
    } catch (e) {
        callback({
            message: 'Unable to load tile "' + tilePath + '": ' + e,
            stack: e.stack,
        });
    }
};

// Given a coordinate in the format [longitude, latitude], return an elevation
GaiaTileSet.prototype.getElevation = function (coord, callback) {
    this._loadTile(coord, (error, tile) => {
        setImmediate(() => {
            if (error) return callback(error, this._NO_DATA);

            const elevation = getHGTElevation(tile, coord);
            if (isNaN(elevation)) return callback(elevation, this._NO_DATA);
            return callback(undefined, elevation || this._NO_DATA);
        });
    });
};

GaiaTileSet.prototype.addElevation = function (geojson, callback) {
    // Elevation lookups are async, so we need to keep track of how many coordinates
    // have successfully been elevated and only callback once all have completed
    const coordCount = coordAll(geojson).length;
    let elevated = 0;
    coordEach(geojson, (coords) => {
        this.getElevation([coords[0], coords[1]], (error, elevation) => {
            coords[2] = elevation;
            elevated++;

            if (elevated === coordCount) {
                setImmediate(() => {
                    callback(undefined, geojson);
                });
            }
        });
    });
};

// via https://github.com/perliedman/node-hgt/blob/master/src/tile-key.js
function zeroPad(v, l) {
    var r = v.toString();
    while (r.length < l) {
        r = '0' + r;
    }
    return r;
}

// Returns a key in the format:
//   LATITUDE DIRECTION + LATITUDE + LONGITUDE DIRECTION + LONGITUDE
// Example: N45W130 or S01E001
function getTileKey(coord) {
    return format(
        '%s%s%s%s',
        coord[1] < 0 ? 'S' : 'N',
        zeroPad(Math.abs(Math.floor(coord[1])), 2),
        coord[0] < 0 ? 'W' : 'E',
        zeroPad(Math.abs(Math.floor(coord[0])), 3)
    );
}

module.exports = GaiaTileSet;
