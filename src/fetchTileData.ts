// Adapted from https://github.com/perliedman/node-hgt/blob/master/src/hgt.js

import fnv1a from '@sindresorhus/fnv1a';
import {LRUCache} from 'lru-cache';
import {fastify} from './server.js';
import type {Fetcher, Reader, TileData} from './types.js';

// Thrown by Fetchers to indicate a missing tile, which may (e.g. elevation) or may not be expected.
export const TILE_MISSING = Symbol();

// Generic error thrown by Fetchers to that signal something went wrong.
export const BAD_TILE = Symbol();

// ...could signal other Fetcher error conditions, e.g. bad permissions, network failure, etc.

const pending = new Map<bigint, Promise<TileData>>();

const missing = new Set<bigint>();

let hits = 0;
let misses = 0;
let evictions = 0;

const cache = new LRUCache<bigint, TileData>({
    sizeCalculation: (tileData) => tileData.bytes,
    maxSize: parseInt(process.env.MAX_LRU_SIZE!), // should be same unit as `sizeCalculation`
    dispose: () => {
        ++evictions;
    },
});

export const interval = setInterval(
    () => {
        const accesses = hits + misses;
        const hitRate = accesses > 0 ? hits / accesses : 0;
        const evictionRate = accesses > 0 ? evictions / accesses : 0;
        const fillPercentage = cache.calculatedSize / cache.maxSize;

        fastify.log.info({lruCacheStats: {fillPercentage, hitRate, evictionRate}});

        // Reset stats each interval. Maybe @TODO: total stats?
        hits = misses = evictions = 0;
    },
    1_000 * 60 * 5, // 5 mins
);

export async function fetchTileData<T extends unknown[], V extends TileData>(
    fetcher: Fetcher<T>, // takes `...args` and returns a `Promise<Buffer>`
    reader: Reader<V>, // takes the `Buffer` returned by `fetcher` and returns `TileData`
    ...args: T // args used by `fetcher`
): Promise<V> {
    const hash = fnv1a(JSON.stringify(args));

    // If the LRU cache has it, return it
    if (cache.has(hash)) {
        ++hits;
        return cache.get(hash)! as V;
    } else {
        ++misses;
    }

    // If we're currently fetching it, return the promise
    if (pending.has(hash)) return pending.get(hash)! as Promise<V>;

    // If we know we can't get it, don't bother trying again
    if (missing.has(hash)) throw TILE_MISSING;

    pending.set(
        hash,
        fetcher(...args)
            .then((buffer) => reader(buffer))
            .then((tileData) => {
                cache.set(hash, tileData); // ...so future requests can use the cache
                return tileData; // ...so pending requests will get the resolved value
            })
            .catch((error: unknown) => {
                if (error === TILE_MISSING) missing.add(hash);
                throw error;
            })
            .finally(() => {
                pending.delete(hash); // ...else we will leak memory, and LRU cache is pointless
            }),
    );

    return pending.get(hash)! as Promise<V>;
}
