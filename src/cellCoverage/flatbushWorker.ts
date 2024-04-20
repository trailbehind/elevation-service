import {VectorTile} from '@mapbox/vector-tile';
import Protobuf from 'pbf';
import {parentPort, workerData} from 'node:worker_threads';
import {isCellCoverageTile} from './isCellCoverageTile.js';
import {cellProviders} from '../types.js';
import Flatbush from 'flatbush';

if (!(workerData instanceof Uint8Array)) throw new TypeError('Expected Uint8Array workerData');

const tile = new VectorTile(new Protobuf(workerData as Uint8Array));

if (!isCellCoverageTile(tile)) throw new TypeError('Vector Tile is not a cell coverage tile');

cellProviders.forEach((provider) => {
    const layer = tile.layers[provider];

    if (layer === undefined) throw new Error(`Missing layer for ${provider}`);
    if (layer.length === 0) throw new Error(`Empty layer for ${provider}`);

    const index = new Flatbush(layer.length, 16, Int16Array);

    for (let i = 0; i < layer.length; i++) {
        const feature = layer.feature(i);
        index.add(...feature.bbox!());
    }

    index.finish();

    parentPort!.postMessage({provider, data: index.data}, [index.data]);
});

parentPort!.close();
