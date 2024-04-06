import path from 'node:path';
import {LRUCache} from 'lru-cache';
import {coordAll, coordEach} from '@turf/meta';
import {fetchHGTData, HGTData, getHGTElevation} from '../HGT/index.js';
import {Feature, FeatureCollection, Geometry, Position} from 'geojson';

type LoadTileCallback = (error: unknown, tile?: HGTData) => void;
type GetElevationCallback = (elevation: number | typeof NO_DATA) => void;
type TileKey = `${'N' | 'S'}${string}${'E' | 'W'}${string}`;

export const NO_DATA = Symbol();

export class GaiaTileSet {
    #tileDir: string;
    #cache = new LRUCache<TileKey, HGTData>({
        maxSize: 500000000, // 500 MB
        sizeCalculation: (n) => n.buffer.length,
        ttl: 1000 * 60 * 60 * 24 * 30, // 30 days
        updateAgeOnGet: true,
    });
    #tileLoadingQueue: Record<TileKey, LoadTileCallback[]> = {};

    constructor(tileDir: string) {
        this.#tileDir = tileDir;
    }

    /**
     * Generates a unique key for a tile based on its coordinates. The key follows the pattern:
     * `LATITUDE HEMISPHERE + LATITUDE + LONGITUDE HEMISPHERE + LONGITUDE`
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
    static #getTileKey(lngDegrees: number, latDegrees: number): TileKey {
        const latHemisphere = latDegrees < 0 ? 'S' : 'N';
        const lat = `${Math.abs(latDegrees)}`.padStart(2, '0');
        const lngHemisphere = lngDegrees < 0 ? 'W' : 'E';
        const lng = `${Math.abs(Math.floor(lngDegrees))}`.padStart(3, '0');

        return `${latHemisphere}${lat}${lngHemisphere}${lng}`;
    }

    /**
     * Loads the HGT tile for a given coordinate.
     *
     * The first argument to the callback is an error object, which is `undefined` if no errors occurred.
     * The second argument is the loaded tile.
     *
     * @private
     */
    #loadTile(coord: Position, callback: LoadTileCallback) {
        const [lngDegrees, latDegrees] = coord.map((n) => Math.floor(n));

        const key = GaiaTileSet.#getTileKey(lngDegrees, latDegrees);

        if (this.#cache.has(key)) return callback(undefined, this.#cache.get(key));

        // We don't want to make more calls to the file system than necessary, so if we are waiting
        // for a tile to load from disk we push the callback into a queue and clear the queue once
        // the tile is done loading.
        if (this.#tileLoadingQueue[key]) return this.#tileLoadingQueue[key].push(callback);

        this.#tileLoadingQueue[key] = [callback];

        const start = process.hrtime.bigint();

        fetchHGTData(
            path.join(this.#tileDir, key + '.hgt'),
            [lngDegrees, latDegrees],
            (error, tile) => {
                const ms = Number((process.hrtime.bigint() - start) / 1_000_000n);

                if (ms > 1000) console.log(`Loading tile ${key} took ${(ms / 1_000).toFixed(3)}s`);

                if (!error) this.#cache.set(key, tile);

                // Call all of the queued callbacks
                this.#tileLoadingQueue[key].forEach((cb) =>
                    error ? cb(error) : cb(undefined, tile),
                );

                delete this.#tileLoadingQueue[key];
            },
        );
    }

    /**
     * Retrieves the elevation for a given coordinate.
     */
    getElevation(coord: Position, callback: GetElevationCallback) {
        this.#loadTile(coord, (error, tile) => {
            if (error) return callback(NO_DATA);

            try {
                const elevation = getHGTElevation(tile!, coord);
                return callback(elevation);
            } catch (error) {
                return callback(NO_DATA);
            }
        });
    }

    /**
     * Adds elevation data to the coordinates of a GeoJSON object.
     */
    addElevation<T extends FeatureCollection | Feature | Geometry>(
        geojson: T,
        callback: (error: unknown, geojson?: T) => void,
    ) {
        // Elevation lookups are async, so we need to keep track of how many coordinates
        // have successfully been elevated and only callback once all have completed
        const coordCount = coordAll(geojson).length;
        let elevated = 0;
        coordEach(geojson, (coord) => {
            this.getElevation([coord[0], coord[1]], (elevation) => {
                coord[2] = elevation === NO_DATA ? 0 : elevation;

                elevated++;

                if (elevated === coordCount) {
                    callback(undefined, geojson);
                }
            });
        });
    }
}
