import {Position} from 'geojson';

export type ElevationTileData = {
    buffer: Buffer;
    resolution: number;
    size: number;
    swLngLat: Position;
};

export const NO_DATA = Symbol();
export const UNSUPPORTED_SIZE = Symbol();
