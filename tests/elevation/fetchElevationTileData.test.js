import 'dotenv/config';
import assert from 'node:assert';
import {it, before, after} from 'node:test';
import {fetchElevationTileData} from '../../dist/elevation/fetchElevationTileData.js';
import {interval as loggingInterval1} from '../../dist/fetchTileData.js';
import {interval as loggingInterval2} from '../../dist/s3Fetcher.js';
import {NO_DATA} from '../../dist/elevation/shared.js';
import {server} from '../../dist/server.js';

// intervals prevent the test runner from exiting
before(async () => {
    clearInterval(loggingInterval1);
    clearInterval(loggingInterval2);
    await server.ready();
});

it('fetches the right tile for the given lng/lat', async () => {
    const data = await fetchElevationTileData([-118.29213, 36.57859]);
    assert.deepEqual(data.swLngLat, [-119, 36]); // -118.29213 rounded (down) to -119
});

it('throws NO_DATA for a missing tile', async () => {
    try {
        await fetchElevationTileData([0, 0]);
    } catch (e) {
        assert.deepEqual(e, NO_DATA);
    }
});

after(() => {
    server.close();
});
