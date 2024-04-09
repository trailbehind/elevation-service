import 'dotenv/config';
import assert from 'node:assert';
import {it} from 'node:test';
import {fetchElevationTileData} from '../../dist/elevation/fetchElevationTileData.js';
import {NO_DATA} from '../../dist/elevation/shared.js';

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
