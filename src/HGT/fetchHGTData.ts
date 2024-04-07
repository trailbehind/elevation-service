// Adapted from https://github.com/perliedman/node-hgt/blob/master/src/hgt.js

import {S3Client, GetObjectCommand} from '@aws-sdk/client-s3';
import {TILE_MISSING, type HGTData, UNSUPPORTED_SIZE, BAD_TILE} from './types.js';
import {Position} from 'geojson';

const s3Client = new S3Client({region: process.env.AWS_REGION});
const THREE_ARC_SECOND = 1442401 * 2;
const ONE_ARC_SECOND = 12967201 * 2;
const missingTiles = new Set<string>();
const Bucket = process.env.AWS_ELEVATION_BUCKET;

export async function fetchHGTData(path: string, swLngLat: Position): Promise<HGTData> {
    try {
        const response = await s3Client.send(new GetObjectCommand({Bucket, Key: path}));
        if (response.Body === undefined) throw BAD_TILE;
        const data = await response.Body.transformToByteArray();
        const buffer = Buffer.from(data);
        const {resolution, size} = getResolutionAndSize(data.length);

        return {buffer, swLngLat, resolution, size};
    } catch (error) {
        if (isNoSuchKeyError(error)) {
            missingTiles.add(error.Key);
            throw TILE_MISSING;
        }

        console.log(`Error fetching tile ${path}`);
        console.log(error);

        throw error;
    }
}

// Via https://github.com/perliedman/node-hgt/blob/master/src/hgt.js#L16
function getResolutionAndSize(size: number): {resolution: number; size: number} {
    switch (size) {
        case ONE_ARC_SECOND:
            return {resolution: 1, size: 3601};
        case THREE_ARC_SECOND:
            return {resolution: 3, size: 1201};
        default:
            throw UNSUPPORTED_SIZE;
    }
}

function isNoSuchKeyError(error: unknown): error is {Code: 'NoSuchKey'; Key: string} {
    return (
        typeof error === 'object' && error !== null && 'Code' in error && error.Code === 'NoSuchKey'
    );
}
