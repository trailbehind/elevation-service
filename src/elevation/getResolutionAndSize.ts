import {UNSUPPORTED_SIZE} from '../types.js';

export const ONE_ARC_SECOND = 12_967_201 * 2;
export const THREE_ARC_SECONDS = 1_442_401 * 2;

export const oneArcSecondResolutionAndSize = {
    resolution: 1,
    size: 3601,
};

export const threeArcSecondResolutionAndSize = {
    resolution: 3,
    size: 1201,
};

// Via https://github.com/perliedman/node-hgt/blob/master/src/hgt.js#L16
export function getResolutionAndSize(bufferSize: number): {resolution: number; size: number} {
    switch (bufferSize) {
        case ONE_ARC_SECOND:
            return oneArcSecondResolutionAndSize;
        case THREE_ARC_SECONDS:
            return threeArcSecondResolutionAndSize;
        default:
            throw UNSUPPORTED_SIZE;
    }
}
