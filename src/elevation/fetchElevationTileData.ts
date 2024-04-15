// Adapted from https://github.com/perliedman/node-hgt/blob/master/src/hgt.js

import path from 'node:path';
import {type Position} from 'geojson';
import {TILE_MISSING, fetchTileData} from '../fetchTileData.js';
import {getElevationTileKey} from './getElevationTileKey.js';
import {getResolutionAndSize} from './getResolutionAndSize.js';
import {type ElevationTileData, NO_DATA} from './shared.js';
import {s3Fetcher} from '../s3Fetcher.js';

const Bucket = process.env.AWS_ELEVATION_BUCKET!;
const tileDir = process.env.TILE_DIRECTORY!;

export async function fetchElevationTileData([lng, lat]: Position): Promise<ElevationTileData> {
    try {
        const lngDegrees = Math.floor(lng);
        const latDegrees = Math.floor(lat);

        const Key = path.join(tileDir, `${getElevationTileKey(lngDegrees, latDegrees)}.hgt`);

        const buffer = await fetchTileData(s3Fetcher, Bucket, Key);

        const {resolution, size} = getResolutionAndSize(buffer.length);

        return {buffer, resolution, size, swLngLat: [lngDegrees, latDegrees]};
    } catch (e: unknown) {
        // A missing tile is considered normal for elevation data, where we simply don't bother
        // keeping tiles with no elevation, e.g. the middle of the ocean. We indicate this
        // "successful failure" by throwing `NO_DATA`, which the caller can interpret as sea level.
        if (e === TILE_MISSING) throw NO_DATA;

        throw e;
    }
}
