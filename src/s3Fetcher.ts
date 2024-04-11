import {GetObjectCommand, S3Client} from '@aws-sdk/client-s3';
import {BAD_TILE, TILE_MISSING} from './fetchTileData.js';
import {fastify} from './server.js';

const s3Client = new S3Client({region: process.env.AWS_REGION});

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
        if (ms > 1000) {
            fastify.log.info(`Loading s3://${Bucket}/${Key} took ${(ms / 1_000).toFixed(3)}s`);
        }
    }
}

function isNoSuchKeyError(error: unknown): error is {Code: 'NoSuchKey'} {
    return (
        typeof error === 'object' && error !== null && 'Code' in error && error.Code === 'NoSuchKey'
    );
}
