import {VectorTile} from '@mapbox/vector-tile';
import Protobuf from 'pbf';
import {BAD_TILE, TILE_MISSING, fetchTileData} from '../fetchTileData.js';
import {
    NO_DATA,
    cellProviders,
    type CellCoverageTile,
    type CellCoverageCacheData,
    type CellCoverageCacheItem,
    type PixelCoordinate,
} from '../types.js';
import {urlFetcher} from '../urlFetcher.js';
import {getCellCoverageTileUrl} from './getCellCoverageTileUrl.js';
import Flatbush from 'flatbush';

export async function fetchCellCoverageTile(
    pixelCoord: PixelCoordinate,
): Promise<CellCoverageCacheData> {
    try {
        const url = getCellCoverageTileUrl(pixelCoord);
        const {data} = await fetchTileData(urlFetcher, reader, url);
        return data;
    } catch (ex: unknown) {
        if (ex === TILE_MISSING) throw NO_DATA;
        throw ex;
    }
}

function isCellCoverageTile(tile: VectorTile): tile is CellCoverageTile {
    return cellProviders.every((provider) => provider in tile.layers);
}

function reader(buffer: Buffer): CellCoverageCacheItem {
    const tile = new VectorTile(new Protobuf(buffer));

    if (!isCellCoverageTile(tile)) throw BAD_TILE;

    const start = process.hrtime.bigint();

    const indexes: {[provider: string]: Flatbush} = {};

    for (const [provider, layer] of Object.entries(tile.layers)) {
        const index = new Flatbush(layer.length, 16, Int16Array);

        indexes[provider] = index;

        for (let i = 0; i < layer.length; i++) {
            const feature = layer.feature(i);
            index.add(...feature.bbox!());
        }

        index.finish();
    }

    console.log(
        'Indexing took',
        `${(Number(process.hrtime.bigint() - start) / 1_000_000).toFixed(3)}ms`,
    );

    return {
        kind: 'cellCoverage',
        get bytes() {
            return (
                buffer.length +
                Object.values(indexes).reduce(
                    (total, index) =>
                        total +
                        index.data.byteLength +
                        index._boxes.length * 2 +
                        index._indices.length * 2,
                    0,
                )
            );
        },
        data: {tile, indexes},
    };
}
