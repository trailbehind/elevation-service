const {coordEach} = require('@turf/meta');

module.exports = (geojson, elevationProvider, req) => {
    let error = undefined;
    coordEach(geojson, (coords, idx) => {
        if (req.timedout) return;
        const [elevationError, elevation] = elevationProvider.getElevation([coords[1], coords[0]]);
        error = elevationError
        coords[2] = elevation;
    });

    return [error, geojson];
}
