import {GetObjectCommand, GetObjectCommandInput, S3Client} from '@aws-sdk/client-s3';
import {BAD_TILE, TILE_MISSING} from './fetchTileData.js';

const s3Client = new S3Client({region: process.env.AWS_REGION});

export async function s3TileFetcher(Bucket: string, Key: string): Promise<Buffer> {
    try {
        const input: GetObjectCommandInput = {Bucket, Key};
        const response = await s3Client.send(new GetObjectCommand(input));
        if (response.Body === undefined) throw BAD_TILE;
        const bytes = await response.Body.transformToByteArray();
        return Buffer.from(bytes);
    } catch (error: unknown) {
        if (isNoSuchKeyError(error)) throw TILE_MISSING;
        throw BAD_TILE;
    }
}

function isNoSuchKeyError(error: unknown): error is {Code: 'NoSuchKey'} {
    return (
        typeof error === 'object' && error !== null && 'Code' in error && error.Code === 'NoSuchKey'
    );
}
