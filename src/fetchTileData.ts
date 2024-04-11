// Adapted from https://github.com/perliedman/node-hgt/blob/master/src/hgt.js

import fnv1a from '@sindresorhus/fnv1a';
import {LRUCache} from 'lru-cache';
import {fastify} from './server.js';

// Generic type for a function that somehow fetches a tile and produces a `Buffer`, e.g.,
// `s3Fetcher` fetches a tile from an S3 bucket.
type Fetcher<T extends unknown[]> = (...args: T) => Promise<Buffer>;

// Thrown by Fetchers to indicate a missing tile, which may (e.g. elevation) or may not be expected.
export const TILE_MISSING = Symbol();

// Generic error thrown by Fetchers to that signal something went wrong.
export const BAD_TILE = Symbol();

// ...could signal other Fetcher error conditions, e.g. bad permissions, network failure, etc.

const cache = new LRUCache<bigint, Buffer>({
    sizeCalculation: (buffer) => buffer.length, // bytes
    maxSize: parseInt(process.env.MAX_LRU_SIZE!), // 500 MB, specified in bytes because `sizeCalculation` returns bytes
});

const pending = new Map<bigint, Promise<Buffer>>();

const missing = new Set<bigint>();

export async function fetchTileData<T extends unknown[]>(fetcher: Fetcher<T>, ...args: T) {
    const hash = fnv1a(JSON.stringify(args));

    // If the LRU cache has it, return it
    if (cache.has(hash)) return cache.get(hash)!;

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
                if (error === TILE_MISSING) {
                    fastify.log.info(`Tile ${JSON.stringify(args)} is missing`);
                    missing.add(hash);
                }
                throw error;
            })
            .finally(() => {
                pending.delete(hash); // ...else we will leak memory, and LRU cache is pointless
            }),
    );

    return pending.get(hash)!;
}
