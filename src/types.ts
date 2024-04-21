import type {VectorTile, VectorTileLayer} from '@mapbox/vector-tile';
import type {Position} from 'geojson';
import type Flatbush from 'flatbush';

export type ElevationCacheData = {
    buffer: Buffer;
    resolution: number;
    size: number;
    swLngLat: Position;
};

export type ElevationCacheItem = {
    kind: 'elevation';
    bytes: number;
    data: ElevationCacheData;
};

export type CellCoverageTile = VectorTile & {
    layers: Record<CellProvider, VectorTileLayer>;
};

export type CellCoverageCacheData = {
    tile: CellCoverageTile;
    indexes: {[provider: string]: Flatbush};
};

export type CellCoverageCacheItem = {
    kind: 'cellCoverage';
    bytes: number;
    data: CellCoverageCacheData;
};

export type CacheItem = ElevationCacheItem | CellCoverageCacheItem;

export type Reader<Item extends CacheItem> = (buffer: Buffer) => Item;

// Generic type for a function that somehow fetches a tile and produces a `Buffer`, e.g.,
// `s3Fetcher` fetches a tile from an S3 bucket.
export type Fetcher<T extends unknown[]> = (...args: T) => Promise<Buffer>;

export const NO_DATA = Symbol();
export const UNSUPPORTED_SIZE = Symbol();

export type CellProvider = 'at-t' | 't-mobile' | 'verizon' | 'all';

export const cellProviders = ['all', 'verizon', 'at-t', 't-mobile'] as const;

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

export type TileIndexWorkerResponse = {uuid: ReturnType<typeof crypto.randomUUID>} & (
    | {
          type: 'index';
          provider: CellProvider;
          data: ArrayBuffer;
      }
    | {
          type: 'done';
      }
    | {
          type: 'error';
          error: unknown;
      }
);

export type TileIndexWorkerRequest = {uuid: ReturnType<typeof crypto.randomUUID>; data: Uint8Array};
