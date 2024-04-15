import {GetObjectCommand, S3Client} from '@aws-sdk/client-s3';
import {BAD_TILE, TILE_MISSING} from './fetchTileData.js';
import {fastify} from './server.js';

const s3Client = new S3Client({region: process.env.AWS_REGION});

let n = 0;
let mean = 0;
let sumOfSquares = 0;
let stdDev = 0;

export const interval = setInterval(
    () => {
        if (mean === 0) return;
        fastify.log.info({s3Stats: {n, mean, stdDev}});
    },
    1_000 * 60 * 5,
);

export async function s3Fetcher(Bucket: string, Key: string): Promise<Buffer> {
    const start = process.hrtime.bigint();

    try {
        const response = await s3Client.send(new GetObjectCommand({Bucket, Key}));
        if (response.Body === undefined) throw BAD_TILE;
        const bytes = await response.Body.transformToByteArray();
        return Buffer.from(bytes);
    } catch (error: unknown) {
        if (isNoSuchKeyError(error)) throw TILE_MISSING;
        throw BAD_TILE;
    } finally {
        const ms = Number((process.hrtime.bigint() - start) / 1_000_000n);

        // update mean and distribution of request times
        ++n;
        const prevMean = mean;
        mean = mean + (ms - mean) / n;
        sumOfSquares = sumOfSquares + (ms - prevMean) * (ms - mean);

        // wait for 10 samples before calculating stdDev
        if (n >= 10) stdDev = Math.sqrt(sumOfSquares / (n - 1));

        // log slow requests (z >= +2)
        if (stdDev > 0) {
            const z = (ms - mean) / stdDev;
            if (z >= 2) {
                fastify.log.info({
                    slowS3Request: {Bucket, Key, ms, z},
                    tileFetchStats: {n, mean, stdDev},
                });
            }
        }
    }
}

function isNoSuchKeyError(error: unknown): error is {Code: 'NoSuchKey'} {
    return (
        typeof error === 'object' && error !== null && 'Code' in error && error.Code === 'NoSuchKey'
    );
}
