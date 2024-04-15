import assert from 'node:assert';
import {test} from 'node:test';
import {getElevationTileKey} from '../../dist/elevation/getElevationTileKey.js';

test('formats south and west', () => {
    assert.strictEqual(getElevationTileKey(-1, -1), 'S01W001');
    assert.strictEqual(getElevationTileKey(-1, -90), 'S90W001');
    assert.strictEqual(getElevationTileKey(-90, -90), 'S90W090');
    assert.strictEqual(getElevationTileKey(-180, -90), 'S90W180');
});

test('formats north and east', () => {
    assert.strictEqual(getElevationTileKey(1, 1), 'N01E001');
    assert.strictEqual(getElevationTileKey(1, 90), 'N90E001');
    assert.strictEqual(getElevationTileKey(90, 90), 'N90E090');
    assert.strictEqual(getElevationTileKey(180, 90), 'N90E180');
});

test('formats north and west', () => {
    assert.strictEqual(getElevationTileKey(-1, 1), 'N01W001');
    assert.strictEqual(getElevationTileKey(-1, 90), 'N90W001');
    assert.strictEqual(getElevationTileKey(-90, 90), 'N90W090');
    assert.strictEqual(getElevationTileKey(-180, 90), 'N90W180');
});

test('formats south and east', () => {
    assert.strictEqual(getElevationTileKey(1, -1), 'S01E001');
    assert.strictEqual(getElevationTileKey(1, -90), 'S90E001');
    assert.strictEqual(getElevationTileKey(90, -90), 'S90E090');
    assert.strictEqual(getElevationTileKey(180, -90), 'S90E180');
});
