// Adapted from https://github.com/perliedman/node-hgt/blob/master/src/hgt.js

import fnv1a from '@sindresorhus/fnv1a';
import {LRUCache} from 'lru-cache';
import {s3TileFetcher} from './s3TileFetcher.js';

export const TILE_MISSING = Symbol();
export const BAD_TILE = Symbol();
// ... other error conditions, e.g. permissions, network failure, etc. ...

const cache = new LRUCache<bigint, Buffer>({
    maxSize: 500_000_000, // 500 MB
    sizeCalculation: ({length}) => length,
    ttl: 1000 * 60 * 60 * 24 * 30, // 30 days
    updateAgeOnGet: true,
});

const pending = new Map<bigint, Promise<Buffer>>();

const missing = new Set<bigint>();

export async function fetchTileData(Bucket: string, Key: string): Promise<Buffer> {
    const hash = fnv1a(JSON.stringify([Bucket, Key]));

    if (cache.has(hash)) return cache.get(hash)!;
    if (pending.has(hash)) return pending.get(hash)!;

    if (missing.has(hash)) throw TILE_MISSING;

    const start = process.hrtime.bigint();

    pending.set(
        hash,
        s3TileFetcher(Bucket, Key)
            .then((buffer) => {
                const ms = Number((process.hrtime.bigint() - start) / 1_000_000n);
                if (ms > 1000) {
                    console.log(`Loading s3://${Bucket}/${Key} took ${(ms / 1_000).toFixed(3)}s`);
                }

                // ...so future requests can use the cache
                cache.set(hash, buffer);

                // ...so pending requests will get the resolved value
                return buffer;
            })
            .catch((error: unknown) => {
                if (error === TILE_MISSING) missing.add(hash);
                throw error;
            })
            .finally(() => {
                // must clean up, else we will leak memory, and make the LRU `maxSize` pointless
                pending.delete(hash);
            }),
    );

    return pending.get(hash)!;
}

/*
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Fetcher<T extends any[]> = (...args: T) => Promise<Buffer>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchTileDataGeneric<T extends any[]>(fetcher: Fetcher<T>, args: T) {
    const hash = fnv1a(JSON.stringify(args));

    if (cache.has(hash)) return cache.get(hash)!;
    if (pending.has(hash)) return pending.get(hash)!;

    if (missing.has(hash)) throw TILE_MISSING;

    pending.set(
        hash,
        fetcher(...args)
            .then((buffer) => {
                cache.set(hash, buffer);
                return buffer;
            })
            .catch((error: unknown) => {
                if (error === TILE_MISSING) missing.add(hash);
                throw error;
            })
            .finally(() => {
                pending.delete(hash);
            }),
    );

    return pending.get(hash)!;
}
*/
