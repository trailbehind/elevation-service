// Adapted from https://github.com/perliedman/node-hgt/blob/master/src/hgt.js

import {GetObjectCommand, GetObjectCommandInput, S3Client} from '@aws-sdk/client-s3';
import fnv1a from '@sindresorhus/fnv1a';
import {LRUCache} from 'lru-cache';

export const TILE_MISSING = Symbol();
export const BAD_TILE = Symbol();

const s3Client = new S3Client({region: process.env.AWS_REGION});

const cache = new LRUCache<bigint, Buffer>({
    maxSize: 500_000_000, // 500 MB
    sizeCalculation: ({length}) => length,
    ttl: 1000 * 60 * 60 * 24 * 30, // 30 days
    updateAgeOnGet: true,
});

const pending = new Map<bigint, Promise<Buffer>>();

const missing = new Set<bigint>();

export async function fetchTileData(Bucket: string, Key: string): Promise<Buffer> {
    const input: GetObjectCommandInput = {Bucket, Key};

    const hash = fnv1a(JSON.stringify(input));

    if (cache.has(hash)) return cache.get(hash)!;
    if (pending.has(hash)) return pending.get(hash)!;

    if (missing.has(hash)) throw TILE_MISSING;

    const start = process.hrtime.bigint();

    const promise: Promise<Buffer> = s3Client
        .send(new GetObjectCommand(input))
        .then((response) => {
            if (response.Body === undefined) throw BAD_TILE;

            return response.Body.transformToByteArray();
        })
        .then((bytes) => {
            const ms = Number((process.hrtime.bigint() - start) / 1_000_000n);
            if (ms > 1000) {
                console.log(`Loading s3://${Bucket}/${Key} took ${(ms / 1_000).toFixed(3)}s`);
            }

            const buffer = Buffer.from(bytes);

            // ...so future requests can use the cache
            cache.set(hash, buffer);

            // ...so pending requests will get the resolved value
            return buffer;
        })
        .catch((error: unknown) => {
            // ...so future requests can skip S3
            if (isNoSuchKeyError(error)) missing.add(hash);

            throw error;
        })
        .finally(() => {
            // must clean up, else we will leak memory, and make the LRU `maxSize` pointless
            pending.delete(hash);
        });

    pending.set(hash, promise);

    return promise;
}

function isNoSuchKeyError(error: unknown): error is {Code: 'NoSuchKey'} {
    return (
        typeof error === 'object' && error !== null && 'Code' in error && error.Code === 'NoSuchKey'
    );
}
