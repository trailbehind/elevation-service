const getHGTElevation = require('./getHGTElevation');
const HGT = require('./');
const path = require('path');

test('it returns a valid elevation', () => {
    const coord = [-93.51432, 44.52342];
    const options = undefined;
    HGT(path.join(__dirname, '..', 'test', 'data', 'N44W094.hgt'), coord, options, (error, tile) => {
        expect(getHGTElevation(tile, coord)).toEqual(305);
    })
})


test('it throws an error when the coordinate is outside the tile bounds', () => {
    const coord = [-93.51432, 44.52342];
    const options = undefined;
    HGT(path.join(__dirname, '..', 'test', 'data', 'N44W094.hgt'), coord, options, (error, tile) => {
        expect(() => getHGTElevation(tile, [-90, 40])).toThrow(Error)
    })
})
