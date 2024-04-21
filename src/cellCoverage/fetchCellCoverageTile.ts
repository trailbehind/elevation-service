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
    type PixelCoordinate,
    type TileIndexWorkerResponse,
} from '../types.js';
import {urlFetcher} from '../urlFetcher.js';
import {getCellCoverageTileUrl} from './getCellCoverageTileUrl.js';
import {isCellCoverageTile} from './isCellCoverageTile.js';

const tileIndexWorker = new Worker(path.join(import.meta.dirname, './tileIndexWorker.js'));

tileIndexWorker.on('error', (error) => {
    console.error('Worker error:', error);
});

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
        const start = process.hrtime.bigint();

        const uuid = crypto.randomUUID();

        const onMessage = (message: TileIndexWorkerResponse) => {
            if (message.uuid !== uuid) return;

            switch (message.type) {
                case 'index': {
                    const {provider, data} = message;
                    indexes[provider] = Flatbush.from(data);
                    break;
                }
                case 'done': {
                    cleanup();
                    break;
                }
            }
        };

        const onError = (error: unknown) => {
            console.error('Worker error:', error);
        };

        const cleanup = () => {
            tileIndexWorker.off('message', onMessage);
            tileIndexWorker.off('error', onError);

            console.log(`Tile index built in ${Number(process.hrtime.bigint() - start) / 1e6}ms`);
        };

        tileIndexWorker.on('message', onMessage);
        tileIndexWorker.on('error', onError);

        tileIndexWorker.postMessage({uuid, data: buffer});
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
