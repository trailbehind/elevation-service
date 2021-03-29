// This file is largely derived from https://github.com/perliedman/node-hgt/blob/master/src/hgt.js
module.exports = function getHGTElevation(hgt, coord) {
    const size = hgt.size - 1;
    const row = (coord[1] - hgt.swLngLat[1]) * size;
    const col = (coord[0] - hgt.swLngLat[0]) * size;

    if (row < 0 || col < 0 || row > size || col > size) {
        return `Latitude/longitude is outside tile bounds (row=${row}, col=${col}; size=${size})`;
    }

    // This could be changed to nearestNeighbor or configured with options,
    // for example return hgt.options.interpolation.call(this, row, col);
    return bilinear(hgt, row, col);
};

const getRowCol = (hgt, row, col) =>
    hgt.buffer.readInt16BE(((hgt.size - row - 1) * hgt.size + col) * 2);

const avg = (v1, v2, f) => v1 + (v2 - v1) * f;

function bilinear(hgt, row, col) {
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

function nearestNeighbour(hgt, row, col) {
    return getRowCol(hgt, Math.round(row), Math.round(col));
}
