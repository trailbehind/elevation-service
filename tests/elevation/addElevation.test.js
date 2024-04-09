import 'dotenv/config';
import assert from 'node:assert';
import {it} from 'node:test';
import {addElevation} from '../../dist/elevation/addElevation.js';
import {coordEach} from '@turf/meta';
import johnMuirTrail from '../data/JMT.json' with {type: 'json'};

it('adds elevation to a FeatureCollection', async () => {
    await addElevation(johnMuirTrail);
    coordEach(johnMuirTrail, ([, , elev]) => {
        assert.strictEqual(elev >= 0, true);
    });
});

it('adds elevation to a single Feature', async () => {
    await addElevation(
        johnMuirTrail.features[Math.floor(Math.random() * johnMuirTrail.features.length)],
    );
    coordEach(johnMuirTrail.features[0], ([, , elev]) => {
        assert.strictEqual(elev >= 0, true);
    });
});

it('adds elevation to a geometry', async () => {
    await addElevation(
        johnMuirTrail.features[Math.floor(Math.random() * johnMuirTrail.features.length)].geometry,
    );
    coordEach(johnMuirTrail.features[0].geometry, ([, , elev]) => {
        assert.strictEqual(elev >= 0, true);
    });
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

    coordEach(somewhereOffTheCoastOfAfrica, ([, , elev]) => {
        assert.strictEqual(elev, 0);
    });
});
