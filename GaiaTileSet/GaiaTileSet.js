import path from 'node:path';
import {LRUCache} from 'lru-cache';
import {coordAll, coordEach} from '@turf/meta';
import {HGT, getHGTElevation} from '../HGT/index.js';

const NO_DATA = 0;

export class GaiaTileSet {
    #tileDir;
    #cache;
    #tileLoadingQueue;

    constructor(tileDir) {
        this.#tileDir = tileDir;
        this.#cache = new LRUCache({
            maxSize: 500000000, // 500 MB
            sizeCalculation: (n) => n.buffer.length,
            ttl: 1000 * 60 * 60 * 24 * 30, // 30 days
            updateAgeOnGet: true,
        });
        this.#tileLoadingQueue = {};
    }

    /**
     * Generates a unique key for a tile based on its coordinates. The key follows the pattern:
     * `LATITUDE HEMISPHERE + LATITUDE + LONGITUDE HEMISPHERE + LONGITUDE`
     *
     * @param {Array} coord - The coordinates of the tile. The first element is the longitude and
     *   the second is the latitude.
     * @returns {string} The unique key for the tile.
     *
     * @private
     * @static
     *
     * @example
     * `N45W130`
     *
     * @example
     * `S01E001`
     */
    static #getTileKey(coord) {
        const latHemisphere = coord[1] < 0 ? 'S' : 'N';
        const lat = `${Math.abs(Math.floor(coord[1]))}`.padStart(2, '0');
        const lngHemisphere = coord[0] < 0 ? 'W' : 'E';
        const lng = `${Math.abs(Math.floor(coord[0]))}`.padStart(3, '0');

        return `${latHemisphere}${lat}${lngHemisphere}${lng}`;
    }

    /**
     * Loads the HGT tile for a given coordinate.
     *
     * @param {Array} coord - The coordinates of the tile to load.
     * @param {Function} callback - A callback function that is called when the tile has been loaded.
     * The first argument to the callback is an error object, which is `undefined` if no errors occurred.
     * The second argument is the loaded tile.
     *
     * @private
     */
    #loadTile(coord, callback) {
        coord = coord.map(Math.floor);
        const key = GaiaTileSet.#getTileKey(coord);
        const cachedTile = this.#cache.get(key);
        if (cachedTile) return callback(undefined, cachedTile);

        // We don't want to make more calls to the file system than necessary, so if we are waiting
        // for a tile to load from disk we push the callback into a queue and clear the queue once
        // the tile is done loading.
        if (this.#tileLoadingQueue[key]) {
            this.#tileLoadingQueue[key].push(callback);
        } else {
            this.#tileLoadingQueue[key] = [callback];

            const start = process.hrtime.bigint();
            const tilePath = path.join(this.#tileDir, key + '.hgt');
            HGT(tilePath, coord, undefined, (error, tile) => {
                const ms = Number((process.hrtime.bigint() - start) / 1_000_000n);
                if (ms > 1000) {
                    console.log(`Loading tile ${key} took ${(ms / 1_000).toFixed(3)}s`);
                }

                if (!error && tile) {
                    this.#cache.set(key, tile);
                }

                // Call all of the queued callbacks
                this.#tileLoadingQueue[key].forEach((cb) => {
                    if (error) return cb({message: error});
                    cb(undefined, tile);
                });
                delete this.#tileLoadingQueue[key];
            });
        }
    }

    /**
     * Retrieves the elevation for a given coordinate.
     *
     * @param {Object} coord - The coordinate object. It should have properties for latitude and
     *   longitude.
     * @param {Function} callback - The callback function to be invoked after the elevation is
     *   retrieved or an error occurs. The callback should accept two parameters: an error object
     *   and the elevation data.
     */
    getElevation(coord, callback) {
        this.#loadTile(coord, (error, tile) => {
            if (error) return callback(error, NO_DATA);

            const elevation = getHGTElevation(tile, coord);
            if (isNaN(elevation)) return callback(elevation, NO_DATA);
            return callback(undefined, elevation || NO_DATA);
        });
    }

    /**
     * Adds elevation data to the coordinates of a GeoJSON object.
     *
     * @param {Object} geojson - The GeoJSON object to which elevation data will be added.
     * @param {Function} callback - A callback function that is called when all elevations have been
     *   added. The first argument to the callback is an error object, which is `undefined` if no
     *   errors occurred. The second argument is the GeoJSON object with added elevation data.
     */
    addElevation(geojson, callback) {
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
    }
}
