import assert from 'node:assert';
import {test} from 'node:test';
import {
    getResolutionAndSize,
    ONE_ARC_SECOND,
    THREE_ARC_SECONDS,
    oneArcSecondResolutionAndSize,
    threeArcSecondResolutionAndSize,
} from '../../dist/elevation/getResolutionAndSize.js';
import {UNSUPPORTED_SIZE} from '../../dist/elevation/shared.js';

test('return values', () => {
    assert.deepEqual(getResolutionAndSize(ONE_ARC_SECOND), oneArcSecondResolutionAndSize);
    assert.deepEqual(getResolutionAndSize(THREE_ARC_SECONDS), threeArcSecondResolutionAndSize);
    assert.throws(
        () => getResolutionAndSize(0),
        (err) => err === UNSUPPORTED_SIZE,
    );
});
