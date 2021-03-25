const HGT = require('./');
const path = require('path');

test('it returns an error if a tile does not exist', () => {
    HGT('./does not exist', [0, 0], undefined, (error, tile) => {
        expect(tile).toBeUndefined();
        expect(error).not.toBeUndefined();
    })
})

test('it returns a valid tile', () => {
    const coord = [-94, 44];
    const options = undefined;
    HGT(path.join(__dirname, '..', 'test', 'data', 'N44W094.hgt'), coord, options, (error, tile) => {
        expect(error).toBeUndefined()
        expect(tile.swLngLat).toEqual(coord)
        expect(tile.options).toEqual(options)
        expect(tile.resolution).toEqual(1)
        expect(tile.size).toEqual(3601)
        expect(Buffer.isBuffer(tile.buffer)).toBe(true)
    })
})
