const {coordAll, coordEach} = require('@turf/meta');

module.exports = (geojson, elevationProvider, callback) => {
    const coordCount = coordAll(geojson).length
    let elevated = 0;
    coordEach(geojson, coords => {
        elevationProvider.getElevation([coords[0], coords[1]], (error, elevation) => {
            coords[2] = elevation;
            elevated++

            if (elevated === coordCount) {
                setImmediate(() => {
                    callback([undefined, geojson]);
                })
            }
        });
    });
}
