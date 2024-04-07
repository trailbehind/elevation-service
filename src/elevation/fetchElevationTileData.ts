// Adapted from https://github.com/perliedman/node-hgt/blob/master/src/hgt.js

import path from 'node:path';
import {Position} from 'geojson';
import {fetchTileData} from '../fetchTileData.js';
import {getElevationTileKey} from './getElevationTileKey.js';
import {getResolutionAndSize} from './getResolutionAndSize.js';
import {ElevationTileData} from './shared.js';
import {s3Fetcher} from '../s3Fetcher.js';

const Bucket = process.env.AWS_ELEVATION_BUCKET!;
const tileDir = process.env.TILE_DIRECTORY!;

export async function fetchElevationTileData([lng, lat]: Position): Promise<ElevationTileData> {
    const lngDegrees = Math.floor(lng);
    const latDegrees = Math.floor(lat);

    const Key = path.join(tileDir, `${getElevationTileKey(lngDegrees, latDegrees)}.hgt`);

    const buffer = await fetchTileData(s3Fetcher, Bucket, Key);

    const {resolution, size} = getResolutionAndSize(buffer.length);

    return {buffer, resolution, size, swLngLat: [lngDegrees, latDegrees]};
}
