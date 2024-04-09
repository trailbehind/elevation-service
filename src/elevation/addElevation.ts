import {coordEach} from '@turf/meta';
import type {Feature, FeatureCollection, Geometry} from 'geojson';
import {getElevation} from './getElevation.js';

/**
 * Adds elevation data to the coordinates of a GeoJSON object. Mutates the GeoJSON input.
 */
export async function addElevation<T extends FeatureCollection | Feature | Geometry>(geoJson: T) {
    const promises: Promise<void>[] = [];

    coordEach(geoJson, (coord) => {
        promises.push(
            getElevation(coord).then((elevation) => {
                coord[2] = elevation;
            }),
        );
    });

    // Use `all`, not `allSettled`, so that unhandled errors propagate
    await Promise.all(promises);
}
