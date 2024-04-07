const getHGTElevation = require('./getElevation.js');
const HGT = require('./index.js');
const path = require('path');

test('it returns a valid elevation', (done) => {
    const coord = [-93.51432, 44.52342];
    const options = undefined;
    HGT(
        path.join(__dirname, '..', 'test', 'data', 'N44W094.hgt'),
        coord,
        options,
        (error, tile) => {
            expect(getHGTElevation(tile, coord)).toEqual(305);
            done();
        },
    );
});

test('it returns an error when the coordinate is outside the tile bounds', (done) => {
    const coord = [-93.51432, 44.52342];
    const options = undefined;
    HGT(
        path.join(__dirname, '..', 'test', 'data', 'N44W094.hgt'),
        coord,
        options,
        (error, tile) => {
            expect(() => isNaN(getHGTElevation(tile, [-90, 40]))).toBeTruthy();
            done();
        },
    );
});
