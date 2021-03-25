const GaiaTileSet = require('./GaiaTileSet');
const path = require('path');

const TEST_DATA_DIR = path.join(__dirname, 'test', 'data')
const NO_DATA = -99999;

describe('GaiaTileSet', () => {
    it('initializes', () => {
        const tiles = new GaiaTileSet(TEST_DATA_DIR, NO_DATA);

        expect(tiles._tileDir).toEqual(TEST_DATA_DIR)
        expect(tiles._NO_DATA).toEqual(NO_DATA)
    })

    it('loads elevation tile for a tile that exists', () => {
        const tiles = new GaiaTileSet(TEST_DATA_DIR, NO_DATA);
        const coord = [-93.51432, 44.52342];
        tiles._loadTile(coord, (error, tile) => {
            expect(error).toBeUndefined()
            expect(tile).not.toBeUndefined()
            expect(Buffer.isBuffer(tile.buffer)).toBe(true)
        })
    })

    it('loads returns an error for a tile that does not exist', () => {
        const tiles = new GaiaTileSet(TEST_DATA_DIR, NO_DATA);
        const coord = [-90, 40];
        tiles._loadTile(coord, (error, tile) => {
            expect(error).not.toBeUndefined()
            expect(tile).toBeUndefined()
        })
    })

    it('caches tiles', () => {
        const tiles = new GaiaTileSet(TEST_DATA_DIR, NO_DATA);
        const coord = [-93.51432, 44.52342];
        tiles._loadTile(coord, (error, tile) => {
            expect(tiles._cache.keys().length).toEqual(1)

            // It doesn't add another tile to the cache
            tiles._loadTile(coord, (error, tile) => {
                expect(tiles._cache.keys().length).toEqual(1)
            })
        })
    })

    it('adds elevation to a coordinate with a tile', () => {
        const tiles = new GaiaTileSet(TEST_DATA_DIR, NO_DATA);
        const coord = [-93.51432, 44.52342];
        tiles.getElevation(coord, (error, elevation) => {
            expect(error).toBeUndefined()
            expect(elevation).toBeCloseTo(323.4159);
        })
    })

    it('returns the NO_DATA value when the tile for a coordinate is not present', () => {
        const tiles = new GaiaTileSet(TEST_DATA_DIR, NO_DATA);
        const coord = [-90, 40];
        tiles.getElevation(coord, (error, elevation) => {
            expect(error).not.toBeUndefined()
            expect(elevation).toEqual(NO_DATA);
        })
    })

    it('adds elevation to a GeoJSON feature', () => {
        const tiles = new GaiaTileSet(TEST_DATA_DIR, NO_DATA);
        const feature = {
            "type": "Feature",
            "properties": {
                "example": "foo"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-93.51432, 44.52342]
            }
        }
        tiles.addElevation(feature, (error, result) => {
            expect(error).toBeUndefined()
            expect(result.properties).toEqual(feature.properties)
            expect(result.geometry.type).toEqual(feature.geometry.type)
            expect(result.geometry.coordinates[2]).toBeCloseTo(323.4159)
        })
    })
})
