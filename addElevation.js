const {coordEach} = require('@turf/meta');

module.exports = (geojson, elevationProvider) => {
    coordEach(geojson, coords => {
        const [, elevation] = elevationProvider.getElevation([coords[1], coords[0]]);
        coords[2] = elevation;
    });

    return [undefined, geojson];
}
