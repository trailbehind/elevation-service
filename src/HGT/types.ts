import type {Position} from 'geojson';

export type HGTData = {
    buffer: Buffer;
    resolution: number;
    size: number;
    swLngLat: Position;
};

export const TILE_MISSING = Symbol();
export const UNSUPPORTED_SIZE = Symbol();
export const BAD_TILE = Symbol();
