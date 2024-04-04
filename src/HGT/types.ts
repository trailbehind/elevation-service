import type {Position} from 'geojson';

export type HGTData = {
    buffer: Buffer;
    resolution: number;
    size: number;
    swLngLat: Position;
};
