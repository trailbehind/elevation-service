import type {Position} from 'geojson';
import {fetchElevationTileData} from './fetchElevationTileData.js';
import {ElevationTileData, NO_DATA} from './types.js';

// This file is largely derived from https://github.com/perliedman/node-hgt/blob/master/src/hgt.js
export async function getElevation(coord: Position) {
    try {
        const hgt = await fetchElevationTileData(coord);

        const size = hgt.size - 1;
        const row = (coord[1] - hgt.swLngLat[1]) * size;
        const col = (coord[0] - hgt.swLngLat[0]) * size;

        if (row < 0 || col < 0 || row > size || col > size) {
            throw `Latitude/longitude is outside tile bounds (row=${row}, col=${col}; size=${size})`;
        }

        // This could be changed to nearestNeighbor or configured with options,
        // for example return hgt.options.interpolation.call(this, row, col);
        return bilinear(hgt, row, col);
    } catch {
        throw NO_DATA;
    }
}

function bilinear(hgt: ElevationTileData, row: number, col: number) {
    const rowLow = Math.floor(row);
    const rowHi = rowLow + 1;
    const rowFrac = row - rowLow;
    const colLow = Math.floor(col);
    const colHi = colLow + 1;
    const colFrac = col - colLow;
    const v00 = getRowCol(hgt, rowLow, colLow);
    const v10 = getRowCol(hgt, rowLow, colHi);
    const v11 = getRowCol(hgt, rowHi, colHi);
    const v01 = getRowCol(hgt, rowHi, colLow);
    const v1 = avg(v00, v10, colFrac);
    const v2 = avg(v01, v11, colFrac);

    return avg(v1, v2, rowFrac);
}

function avg(v1: number, v2: number, f: number) {
    return v1 + (v2 - v1) * f;
}

function _nearestNeighbour(hgt: ElevationTileData, row: number, col: number) {
    return getRowCol(hgt, Math.round(row), Math.round(col));
}

function getRowCol(hgt: ElevationTileData, row: number, col: number) {
    return hgt.buffer.readInt16BE(((hgt.size - row - 1) * hgt.size + col) * 2);
}
