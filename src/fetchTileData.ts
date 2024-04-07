// Adapted from https://github.com/perliedman/node-hgt/blob/master/src/hgt.js

import fnv1a from '@sindresorhus/fnv1a';
import {LRUCache} from 'lru-cache';

type Fetcher<T extends unknown[]> = (...args: T) => Promise<Buffer>;

export const TILE_MISSING = Symbol(); // MUST be thrown by `Fetcher` to indicate a missing tile
export const BAD_TILE = Symbol();
// ... could signal other error conditions, e.g. bad permissions, network failure, etc.

const cache = new LRUCache<bigint, Buffer>({
    maxSize: 500_000_000, // 500 MB
    sizeCalculation: ({length}) => length,
    ttl: 1000 * 60 * 60 * 24 * 30, // 30 days
    updateAgeOnGet: true,
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
                if (error === TILE_MISSING) missing.add(hash);
                throw error;
            })
            .finally(() => {
                pending.delete(hash); // ... else we will leak memory & LRU cache is pointless
            }),
    );

    return pending.get(hash)!;
}
