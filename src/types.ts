import type {VectorTile, VectorTileLayer} from '@mapbox/vector-tile';
import type {Position} from 'geojson';

export type ElevationTile = {
    buffer: Buffer;
    resolution: number;
    size: number;
    swLngLat: Position;
};

export type ElevationTileData = {
    kind: 'elevation';
    bytes: number;
    data: ElevationTile;
};

export type CellCoverageTile = VectorTile & {
    layers: Record<CellProvider, VectorTileLayer>;
};

export type CellCoverageTileData = {
    kind: 'cellCoverage';
    bytes: number;
    data: CellCoverageTile;
};

export type TileData = ElevationTileData | CellCoverageTileData;

export type Reader<V extends TileData> = (buffer: Buffer) => V;

// Generic type for a function that somehow fetches a tile and produces a `Buffer`, e.g.,
// `s3Fetcher` fetches a tile from an S3 bucket.
export type Fetcher<T extends unknown[]> = (...args: T) => Promise<Buffer>;

export const NO_DATA = Symbol();
export const UNSUPPORTED_SIZE = Symbol();

export type CellProvider = 'at-t' | 't-mobile' | 'verizon' | 'all';

export const cellProviders = ['at-t', 't-mobile', 'verizon', 'all'] as const;

export type CellCoverage = null | 0 | 1 | 2 | 3;

export function isCellCoverage(value: unknown): value is CellCoverage {
    if (value === null) return true;
    if (typeof value === 'string') value = parseInt(value);
    if (typeof value !== 'number') return false;
    return value >= 0 && value <= 3;
}

export type GetCoverageFromLayerArgs = {
    layer: VectorTileLayer;
    numFeatures: number;
    worldCoord: [x: number, y: number];
};

export type PixelCoordinate = [x: number, y: number, z: number];
