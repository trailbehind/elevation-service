const _latLng = require('./latlng');

const getRowCol = (hgt, row, col) =>
    hgt.buffer.readInt16BE(((hgt.size - row - 1) * hgt.size + col) * 2);

module.exports = function getHGTElevation(hgt, latLng) {
    const size = hgt.size - 1;
    const ll = _latLng(latLng);
    const row = (ll.lat - hgt.swLatLng.lat) * size;
    const col = (ll.lng - hgt.swLatLng.lng) * size;

    if (row < 0 || col < 0 || row > size || col > size) {
        throw new Error('Latitude/longitude is outside tile bounds (row=' +
            row + ', col=' + col + '; size=' + size);
    }

    return bilinear(hgt, row, col)
    // return hgt.options.interpolation.call(this, row, col);
}

function bilinear(hgt, row, col) {
    const avg = (v1, v2, f) => v1 + (v2 - v1) * f;

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