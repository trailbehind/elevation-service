// Adapted from https://github.com/perliedman/node-hgt/blob/master/src/hgt.js

import {S3Client, GetObjectCommand} from '@aws-sdk/client-s3';
import {Stream} from 'node:stream';
import type {HGTData} from './types.js';
import {Position} from 'geojson';

const getResolutionAndSizeError = Symbol();

const s3Client = new S3Client({region: process.env.AWS_REGION});
const THREE_ARC_SECOND = 1442401 * 2;
const ONE_ARC_SECOND = 12967201 * 2;
const missingTiles = new Set<string>();

export function fetchHGTData(
    path: string,
    swLngLat: Position,
    callback: (error?: unknown, hgt?: HGTData) => void,
) {
    const Key = path;

    if (missingTiles.has(Key)) {
        return callback(`Tile missing: ${Key}`);
    }

    s3Client
        .send(new GetObjectCommand({Bucket: process.env.AWS_ELEVATION_BUCKET, Key}))
        .then(async (dem) => {
            if (dem.ContentLength === undefined) return callback(`No content length for ${path}`);

            const resAndSize = getResolutionAndSize(dem.ContentLength);

            if (dem.Body === undefined) return callback(`No body for ${path}`);

            const buffer = await streamToBuffer(dem.Body as Stream);

            return callback(undefined, {
                buffer,
                resolution: resAndSize.resolution,
                size: resAndSize.size,
                swLngLat,
            });
        })
        .catch((error: unknown) => {
            if (isMissingTile(error)) {
                missingTiles.add(error.Key);
                return callback(`Tile missing: ${error.Key}`);
            }

            if (error === getResolutionAndSizeError) {
                return callback('Unknown tile format (1 arcsecond and 3 arcsecond supported).');
            }

            console.log(error);
            console.log(`Error fetching tile ${path}`, error);
            callback(`Error fetching tile ${path}`);
        });
}

// Via https://github.com/perliedman/node-hgt/blob/master/src/hgt.js#L16
function getResolutionAndSize(size: number): {resolution: number; size: number} {
    switch (size) {
        case ONE_ARC_SECOND:
            return {resolution: 1, size: 3601};
        case THREE_ARC_SECOND:
            return {resolution: 3, size: 1201};
        default:
            throw getResolutionAndSizeError;
    }
}

// Stream an HGT file from S3 into a buffer
async function streamToBuffer(stream: Stream): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Uint8Array[] = [];
        stream.on('data', (chunk: Uint8Array) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
}

function isMissingTile(error: unknown): error is {Code: 'NoSuchKey'; Key: string} {
    return (
        typeof error === 'object' && error !== null && 'Code' in error && error.Code === 'NoSuchKey'
    );
}
