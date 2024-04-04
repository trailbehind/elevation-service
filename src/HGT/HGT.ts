import {S3Client, GetObjectCommand} from '@aws-sdk/client-s3';
import {Stream} from 'node:stream';
import type {HGTData} from './types.js';
import {Position} from 'geojson';

const THREE_ARC_SECOND = 1442401 * 2;
const ONE_ARC_SECOND = 12967201 * 2;

const s3Client = new S3Client({region: process.env.AWS_REGION});

// Adapted from https://github.com/perliedman/node-hgt/blob/master/src/hgt.js

export function HGT(
    path: string,
    swLngLat: Position,
    callback: (error?: unknown, hgt?: HGTData) => void,
) {
    s3Client
        .send(
            new GetObjectCommand({
                Bucket: process.env.AWS_ELEVATION_BUCKET,
                Key: path,
            }),
        )
        .then(async (dem) => {
            if (dem.ContentLength === undefined) return callback(`No content length for ${path}`);

            const [resError, resAndSize] = getResolutionAndSize(dem.ContentLength);

            if (resError) return callback(resError);

            if (dem.Body === undefined) return callback(`No body for ${path}`);

            const buffer = await streamToBuffer(dem.Body as Stream);

            return callback(undefined, {
                buffer,
                resolution: resAndSize!.resolution,
                size: resAndSize!.size,
                swLngLat,
            });
        })
        .catch((error) => {
            console.log(`Error fetching tile ${path}`, error);
            callback(`Error fetching tile ${path}`);
        });
}

// Via https://github.com/perliedman/node-hgt/blob/master/src/hgt.js#L16
function getResolutionAndSize(
    size: number,
): [error?: unknown, resAndSize?: {resolution: number; size: number}] {
    if (size === ONE_ARC_SECOND) {
        return [
            undefined,
            {
                resolution: 1,
                size: 3601,
            },
        ];
    } else if (size === THREE_ARC_SECOND) {
        return [
            undefined,
            {
                resolution: 3,
                size: 1201,
            },
        ];
    } else {
        return ['Unknown tile format (1 arcsecond and 3 arcsecond supported).'];
    }
}

// Stream an HGT file from S3 into a buffer
function streamToBuffer(stream: Stream): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Uint8Array[] = [];
        stream.on('data', (chunk: Uint8Array) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
}
