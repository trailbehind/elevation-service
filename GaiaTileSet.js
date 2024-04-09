const path = require('path');
const { LRUCache } = require("lru-cache");
const { coordAll, coordEach } = require("@turf/meta");
const HGT = require("./hgt");
const getHGTElevation = require("./hgt/getHGTElevation");

function GaiaTileSet(tileDir, NO_DATA = 0) {
    this._tileDir = tileDir;
    const options = {
        maxSize: 500000000, // 500 MB
        ttl: 1000 * 60 * 60 * 24 * 30, // 30 days
        sizeCalculation: (n) => n.buffer.length,
        updateAgeOnGet: true,
    };
    this._cache = new LRUCache(options);
    this._NO_DATA = NO_DATA;

    this._tileLoadingQueue = {};
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

    // We don't want to make more calls to the file system than necessary, so if we are waiting
    // for a tile to load from disk we push the callback into a queue and clear the queue once
    // the tile is done loading.
    if (this._tileLoadingQueue[key]) {
        this._tileLoadingQueue[key].push(callback);
    } else {
        this._tileLoadingQueue[key] = [callback];

        const start = process.hrtime();
        const tilePath = path.join(this._tileDir, key + '.hgt');
        HGT(tilePath, coord, undefined, (error, tile) => {
            const end = process.hrtime(start);
            if (end[0] > 1) {
                console.log(`Loading tile ${key} took ${end[0]}s ${Math.round(end[1] / 1000000)}ms`);
            }

            if (!error && tile) {
                this._cache.set(key, tile);
            }

            // Call all of the queued callbacks
            this._tileLoadingQueue[key].forEach(cb => {
                if (error) return cb({message: error});
                cb(undefined, tile);
            });
            delete this._tileLoadingQueue[key];
        });
    }
};

// Given a coordinate in the format [longitude, latitude], return an elevation
GaiaTileSet.prototype.getElevation = function (coord, callback) {
    this._loadTile(coord, (error, tile) => {
        if (error) return callback(error, this._NO_DATA);

        const elevation = getHGTElevation(tile, coord);
        if (isNaN(elevation)) return callback(elevation, this._NO_DATA);
        return callback(undefined, elevation || this._NO_DATA);
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
                callback(undefined, geojson);
            }
        });
    });
};

// via https://github.com/perliedman/node-hgt/blob/master/src/tile-key.js
function zeroPad(value, len) {
    let string = value.toString();
    while (string.length < len) {
        string = `0${string}`;
    }
    return string;
}

// Returns a key in the format:
//   LATITUDE HEMISPHERE + LATITUDE + LONGITUDE HEMISPHERE + LONGITUDE
// Example: N45W130 or S01E001
function getTileKey(coord) {
    const latHemisphere = coord[1] < 0 ? 'S' : 'N';
    const lat = zeroPad(Math.abs(Math.floor(coord[1])), 2);
    const lngHemisphere = coord[0] < 0 ? 'W' : 'E';
    const lng = zeroPad(Math.abs(Math.floor(coord[0])), 3);

    return `${latHemisphere}${lat}${lngHemisphere}${lng}`;
}

module.exports = GaiaTileSet;
