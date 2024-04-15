import 'dotenv/config';
import assert from 'node:assert';
import {it, before, after} from 'node:test';
import {addElevation} from '../../dist/elevation/addElevation.js';
import {coordEach} from '@turf/meta';
import johnMuirTrail from '../data/JMT.json' with {type: 'json'};
import {interval as loggingInterval1} from '../../dist/fetchTileData.js';
import {interval as loggingInterval2} from '../../dist/s3Fetcher.js';
import {server} from '../../dist/server.js';

// intervals prevent the test runner from exiting
before(async () => {
    clearInterval(loggingInterval1);
    clearInterval(loggingInterval2);
    await server.ready();
});

it('adds elevation to a FeatureCollection', async () => {
    const jmt = structuredClone(johnMuirTrail);

    await addElevation(jmt);

    coordEach(jmt, ([, , elev]) => assert.strictEqual(elev > 0, true));
});

it('adds elevation to a single Feature', async () => {
    const feature = structuredClone(
        johnMuirTrail.features[Math.floor(Math.random() * johnMuirTrail.features.length)],
    );

    await addElevation(feature);

    coordEach(feature, ([, , elev]) => assert.strictEqual(elev > 0, true));
});

it('adds elevation to a geometry', async () => {
    const geometry = structuredClone(
        johnMuirTrail.features[Math.floor(Math.random() * johnMuirTrail.features.length)].geometry,
    );

    await addElevation(geometry);

    coordEach(geometry, ([, , elev]) => assert.strictEqual(elev > 0, true));
});

it('returns 0 elevation for geometry with no data', async () => {
    const somewhereOffTheCoastOfAfrica = {
        type: 'LineString',
        coordinates: [
            [0, 0],
            [0.25, 0.25],
            [0.5, 0.5],
            [0.75, 0.75],
            [1, 1],
        ],
    };

    await addElevation(somewhereOffTheCoastOfAfrica);

    coordEach(somewhereOffTheCoastOfAfrica, ([, , elev]) => assert.strictEqual(elev, 0));
});

after(async () => {
    await server.close();
});
