// Adapted from https://github.com/perliedman/node-hgt/blob/master/src/hgt.js

import path from 'node:path';
import {type Position} from 'geojson';
import {TILE_MISSING, fetchTileData} from '../fetchTileData.js';
import {getElevationTileKey} from './getElevationTileKey.js';
import {getResolutionAndSize} from './getResolutionAndSize.js';
import {s3Fetcher} from '../s3Fetcher.js';
import {NO_DATA, type ElevationCacheData, type ElevationCacheItem, type Reader} from '../types.js';

const Bucket = process.env.AWS_ELEVATION_BUCKET!;
const tileDir = process.env.TILE_DIRECTORY!;

export async function fetchElevationTile([lng, lat]: Position): Promise<ElevationCacheData> {
    try {
        const lngDegrees = Math.floor(lng);
        const latDegrees = Math.floor(lat);
        const reader = getElevationTileReader(lngDegrees, latDegrees);

        const Key = path.join(tileDir, `${getElevationTileKey(lngDegrees, latDegrees)}.hgt`);

        const {data} = await fetchTileData(s3Fetcher, reader, Bucket, Key);

        return data;
    } catch (e: unknown) {
        // A missing tile is considered normal for elevation data, where we simply don't bother
        // keeping tiles with no elevation, e.g. the middle of the ocean. We indicate this
        // "successful failure" by throwing `NO_DATA`, which the caller can interpret as sea level.
        if (e === TILE_MISSING) throw NO_DATA;

        throw e;
    }
}

function getElevationTileReader(
    lngDegrees: number,
    latDegrees: number,
): Reader<ElevationCacheItem> {
    return function readElevationTileData(buffer: Buffer): ElevationCacheItem {
        const {resolution, size} = getResolutionAndSize(buffer.length);

        return {
            kind: 'elevation',
            bytes: buffer.length,
            data: {buffer, resolution, size, swLngLat: [lngDegrees, latDegrees]},
        };
    };
}
