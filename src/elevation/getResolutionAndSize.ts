import {UNSUPPORTED_SIZE} from './types.js';

const THREE_ARC_SECOND = 1_442_401 * 2;
const ONE_ARC_SECOND = 12_967_201 * 2;

// Via https://github.com/perliedman/node-hgt/blob/master/src/hgt.js#L16
export function getResolutionAndSize(size: number): {resolution: number; size: number} {
    switch (size) {
        case ONE_ARC_SECOND:
            return {resolution: 1, size: 3601};
        case THREE_ARC_SECOND:
            return {resolution: 3, size: 1201};
        default:
            throw UNSUPPORTED_SIZE;
    }
}
