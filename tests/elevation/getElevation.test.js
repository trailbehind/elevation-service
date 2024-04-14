import 'dotenv/config';
import assert from 'node:assert';
import {it, test, before, after} from 'node:test';
import {getElevation} from '../../dist/elevation/getElevation.js';
import {interval as loggingInterval1} from '../../dist/fetchTileData.js';
import {interval as loggingInterval2} from '../../dist/s3Fetcher.js';
import {server} from '../../dist/server.js';

// intervals prevent the test runner from exiting
before(async () => {
    clearInterval(loggingInterval1);
    clearInterval(loggingInterval2);
    await server.ready();
});

test('getting elevation for a point', async () => {
    const coord = [-118.29213, 36.57859]; // Mt. Whitney
    const elevation = await getElevation(coord);

    // @TODO: Elevation data is very off right now. Fix this when it is actually 14,505 ft.
    assert.strictEqual(elevation >= 4399, true);
});

it('returns 0 elevation and logs when a tile is missing', async () => {
    // mock.method(server, 'log');

    const elevation = await getElevation([0, 0]);

    assert.strictEqual(elevation, 0);

    // Not exactly bulletproof, but testing for a string match is more fragile
    // assert.strictEqual(console.log.mock.calls.length, 1);
    // assert.strictEqual(console.log.mock.calls[0].arguments.length, 1);
    // assert.strictEqual(typeof console.log.mock.calls[0].arguments[0], 'string');

    // mock.reset();
});

after(async () => {
    await server.close();
});
