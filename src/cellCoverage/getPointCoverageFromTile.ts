import type {VectorTile} from '@mapbox/vector-tile';
import pointInPolygon from 'point-in-polygon';
import {isCellCoverage, type CellCoverage, type CellProvider} from '../types.js';

/**
 * Searching an individual tile's features for cell coverage data for a single point is done in a
 * loop over all the features. If there are `n` points and `m` features, the time complexity is
 * `O(n * m)`.
 *
 * In order to break this up and unblock the main thread, each point is processed in a separate
 * task, so that the time complexity of searching for a single feature is only `O(m)` and the main
 * thread is unblocked between points, to allow the server to at least start handling other
 * requests.
 *
 * The goal is to maximize server throughput at the expense of increased latency for cell coverage.
 */
export async function getPointCoverageFromTile(
    tile: VectorTile,
    provider: CellProvider,
    worldCoord: [x: number, y: number, z: number],
): Promise<CellCoverage> {
    return new Promise((resolve) => {
        setImmediate(() => {
            const layer = tile.layers[provider];
            const [x, y] = worldCoord;

            for (let i = 0; i < layer.length; i++) {
                const feature = layer.feature(i);

                const geometry = feature.loadGeometry();

                for (const ring of geometry) {
                    const polygon = ring.map((point) => [point.x, point.y]);

                    if (pointInPolygon([x, y], polygon)) {
                        const {tech} = feature.properties;
                        return resolve(isCellCoverage(tech) ? tech : null);
                    }
                }
            }

            resolve(null);
        });
    });
}
