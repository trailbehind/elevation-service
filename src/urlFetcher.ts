import {BAD_TILE, TILE_MISSING} from './fetchTileData.js';
import {fastify} from './server.js';

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

export async function urlFetcher(url: string): Promise<Buffer> {
    const start = process.hrtime.bigint();

    try {
        // load response from URL
        const response = await fetch(url);

        if (!response.ok) {
            switch (response.status) {
                case 404:
                    throw TILE_MISSING;
                default:
                    throw BAD_TILE;
            }
        }

        const buffer = await response.arrayBuffer();
        return Buffer.from(buffer);
    } catch (ex: unknown) {
        switch (ex) {
            case TILE_MISSING:
                throw TILE_MISSING;
            default:
                throw BAD_TILE;
        }
    } finally {
        const ms = Number((process.hrtime.bigint() - start) / 1_000_000n);

        // update mean and distribution of request times
        ++n;
        const prevMean = mean;
        mean = mean + (ms - mean) / n;
        sumOfSquares = sumOfSquares + (ms - prevMean) * (ms - mean);

        // wait for 10 samples before calculating stdDev
        if (n > 10) stdDev = Math.sqrt(sumOfSquares / (n - 1));

        // log slow requests (z >= +2)
        if (stdDev > 0) {
            const z = (ms - mean) / stdDev;
            if (z >= 2) {
                fastify.log.info({
                    slowUrlRequest: {url, ms, z},
                    tileFetchStats: {n, mean, stdDev},
                });
            }
        }
    }
}
