const {coordEach} = require('@turf/meta');

module.exports = (geojson, elevationProvider) => {
    const errors = []
    coordEach(geojson, coords => {
        const [error, elevation] = elevationProvider.getElevation([coords[1], coords[0]]);
        if (error) {
            errors.push(error)
            return;
        };
        coords[2] = elevation;
    });
    if (errors.length) return [errors[0]];
    return [undefined, geojson];
}
