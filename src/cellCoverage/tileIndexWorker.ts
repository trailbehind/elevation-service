import {VectorTile} from '@mapbox/vector-tile';
import Flatbush from 'flatbush';
import {parentPort} from 'node:worker_threads';
import Protobuf from 'pbf';
import {
    cellProviders,
    type TileIndexWorkerRequest,
    type TileIndexWorkerResponse,
} from '../types.js';
import {isCellCoverageTile} from './isCellCoverageTile.js';

function buildTileIndexes(uuid: ReturnType<typeof crypto.randomUUID>, data: Uint8Array) {
    const tile = new VectorTile(new Protobuf(data));

    if (!isCellCoverageTile(tile)) {
        const error = new TypeError('Vector Tile is not a cell coverage tile');
        parentPort!.postMessage({type: 'error', uuid, error} satisfies TileIndexWorkerResponse);
        parentPort!.postMessage({type: 'done', uuid} satisfies TileIndexWorkerResponse);
        return;
    }

    cellProviders.forEach((provider) => {
        try {
            const layer = tile.layers[provider];
            if (layer === undefined) throw new Error(`Missing layer for ${provider}`);
            if (layer.length === 0) throw new Error(`Empty layer for ${provider}`);

            const index = new Flatbush(layer.length, 1, Int16Array);

            for (let i = 0; i < layer.length; i++) {
                const feature = layer.feature(i);
                index.add(...feature.bbox!());
            }

            index.finish();

            const {data} = index;

            parentPort!.postMessage(
                {type: 'index', uuid, provider, data} satisfies TileIndexWorkerResponse,
                [data],
            );
        } catch (error: unknown) {
            parentPort!.postMessage({type: 'error', uuid, error} satisfies TileIndexWorkerResponse);
        }
    });

    parentPort!.postMessage({type: 'done', uuid} satisfies TileIndexWorkerResponse);
}

parentPort!.on('message', ({uuid, data}: TileIndexWorkerRequest) => {
    buildTileIndexes(uuid, data);
});
