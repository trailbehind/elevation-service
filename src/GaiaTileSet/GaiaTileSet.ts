import path from 'node:path';
import {LRUCache} from 'lru-cache';
import {coordEach} from '@turf/meta';
import {fetchHGTData, HGTData, getHGTElevation} from '../HGT/index.js';
import {Feature, FeatureCollection, Geometry, Position} from 'geojson';

type LoadTileCallback = (error: unknown, tile?: HGTData) => void;
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
    async getElevation(coord: Position): Promise<number> {
        try {
            const tile = await new Promise<HGTData>((resolve, reject) => {
                this.#loadTile(coord, (error, tile) => (error ? reject(error) : resolve(tile!)));
            });

            return getHGTElevation(tile, coord);
        } catch {
            throw NO_DATA;
        }
    }

    /**
     * Adds elevation data to the coordinates of a GeoJSON object. Mutates the GeoJSON input.
     */
    async addElevation<T extends FeatureCollection | Feature | Geometry>(geoJson: T) {
        const promises: Promise<void>[] = [];

        coordEach(geoJson, (coord) => {
            promises.push(
                this.getElevation(coord).then(
                    (elevation) => {
                        coord[2] = elevation;
                    },
                    (error: unknown) => {
                        if (error === NO_DATA) {
                            coord[2] = 0; // Default to Sea Level if data is missing
                        } else {
                            throw error; // Anything else is unhandled
                        }
                    },
                ),
            );
        });

        // Not `allSettled`: unhandled errors propagate
        await Promise.all(promises);
    }
}
