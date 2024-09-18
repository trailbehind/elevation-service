// Adapted from https://github.com/perliedman/node-hgt/blob/master/src/hgt.js

import fnv1a from '@sindresorhus/fnv1a';
import {LRUCache} from 'lru-cache';
import {server} from './server.js';

// Generic type for a function that somehow fetches a tile and produces a `Buffer`, e.g.,
// `s3Fetcher` fetches a tile from an S3 bucket.
type Fetcher<T extends unknown[]> = (...args: T) => Promise<Buffer>;

// Thrown by Fetchers to indicate a missing tile, which may (e.g. elevation) or may not be expected.
export const TILE_MISSING = Symbol();

// Generic error thrown by Fetchers to that signal something went wrong.
export const BAD_TILE = Symbol();

// ...could signal other Fetcher error conditions, e.g. bad permissions, network failure, etc.

const pending = new Map<bigint, Promise<Buffer>>();

const missing = new Set<bigint>();

let hits = 0;
let misses = 0;
let evictions = 0;

const cache = new LRUCache<bigint, Buffer>({
    sizeCalculation: (buffer) => buffer.length, // bytes
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

        server.log.info({lruCacheStats: {fillPercentage, hitRate, evictionRate}});

        // Reset stats each interval. Maybe @TODO: total stats?
        hits = misses = evictions = 0;
    },
    1_000 * 60 * 5, // 5 mins
);

export async function fetchTileData<T extends unknown[]>(fetcher: Fetcher<T>, ...args: T) {
    const hash = fnv1a(JSON.stringify(args));

    // If the LRU cache has it, return it
    if (cache.has(hash)) {
        ++hits;
        return cache.get(hash)!;
    } else {
        ++misses;
    }

    // If we're currently fetching it, return the promise
    if (pending.has(hash)) return pending.get(hash)!;

    // If we know we can't get it, don't bother trying again
    if (missing.has(hash)) throw TILE_MISSING;

    pending.set(
        hash,
        fetcher(...args)
            .then((buffer) => {
                cache.set(hash, buffer); // ...so future requests can use the cache
                return buffer; // ...so pending requests will get the resolved value
            })
            .catch((error: unknown) => {
                if (error === TILE_MISSING) missing.add(hash);
                throw error;
            })
            .finally(() => {
                pending.delete(hash); // ...else we will leak memory, and LRU cache is pointless
            }),
    );

    return pending.get(hash)!;
}
