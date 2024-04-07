import {coordEach} from '@turf/meta';
import {Feature, FeatureCollection, Geometry} from 'geojson';
import {getElevation} from './getElevation.js';
import {NO_DATA} from './types.js';

/**
 * Adds elevation data to the coordinates of a GeoJSON object. Mutates the GeoJSON input.
 */
export async function addElevation<T extends FeatureCollection | Feature | Geometry>(geoJson: T) {
    const promises: Promise<void>[] = [];

    coordEach(geoJson, (coord) => {
        promises.push(
            getElevation(coord)
                .then((elevation) => {
                    coord[2] = elevation;
                })
                .catch((error: unknown) => {
                    if (error === NO_DATA) {
                        coord[2] = 0; // Default to sea level if data is missing
                    } else {
                        throw error; // Anything else is unhandled
                    }
                }),
        );
    });

    // Use `all`, not `allSettled`, so that unhandled errors propagate
    await Promise.all(promises);
}
