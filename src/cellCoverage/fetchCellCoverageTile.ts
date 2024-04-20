import {VectorTile} from '@mapbox/vector-tile';
import Flatbush from 'flatbush';
import path from 'node:path';
import {Worker} from 'node:worker_threads';
import Protobuf from 'pbf';
import {BAD_TILE, TILE_MISSING, fetchTileData} from '../fetchTileData.js';
import {
    NO_DATA,
    type CellCoverageCacheData,
    type CellCoverageCacheItem,
    type CellProvider,
    type PixelCoordinate,
} from '../types.js';
import {urlFetcher} from '../urlFetcher.js';
import {getCellCoverageTileUrl} from './getCellCoverageTileUrl.js';
import {isCellCoverageTile} from './isCellCoverageTile.js';

type FlatbushIndex = {
    provider: CellProvider;
    data: ArrayBuffer;
};

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

function reader(buffer: Buffer): CellCoverageCacheItem {
    const tile = new VectorTile(new Protobuf(buffer));

    if (!isCellCoverageTile(tile)) throw BAD_TILE;

    // will be populated by the worker as the indexes are built
    const indexes: {[provider: string]: Flatbush} = {};

    /**
     * Once the tile is fetched, we build Hilbert R-tree indexes for the features in each layer
     * so we don't have to iterate over all features to find the ones that intersect a given point.
     * Building the indexes is computationally expensive, so we do it in a worker thread.
     *
     * We don't want to block while the indexes are being built, so `getPointCoverageFromTile` will
     * perform brute-force searches until the index is available.
     */
    setImmediate(() => {
        const worker = new Worker(path.join(import.meta.dirname, './flatbushWorker.js'), {
            workerData: buffer, // buffer is serialized to `Uint8Array` when sent to worker
        });

        worker.on('message', ({provider, data}: FlatbushIndex) => {
            indexes[provider] = Flatbush.from(data);
        });

        worker.on('exit', () => {
            worker.removeAllListeners(); // cleanup
        });
    });

    return {
        kind: 'cellCoverage',
        get bytes() {
            return (
                buffer.length +
                // `Flatbush` objects have other properties, so this is just a low-ball estimate,
                // but the bulk of the data structure is in buffers whose size we can compute: the
                // `Flatbush` object is created with `Int16Array` as the `ArrayType` (since the
                // tiles have an extent of `4096`).
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
