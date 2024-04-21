import pointInPolygon from 'point-in-polygon';
import {
    isCellCoverage,
    type CellCoverage,
    type CellCoverageCacheData,
    type CellProvider,
    type PixelCoordinate,
} from '../types.js';

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
    data: CellCoverageCacheData,
    provider: CellProvider,
    pixelCoord: PixelCoordinate,
): Promise<CellCoverage> {
    return new Promise((resolve) => {
        setImmediate(() => {
            const {tile} = data;
            const layer = tile.layers[provider];
            const {extent} = layer;

            const [pixelX, pixelY] = pixelCoord;
            const [fracX, fracY] = [pixelX - Math.trunc(pixelX), pixelY - Math.trunc(pixelY)];
            const [tileX, tileY] = [Math.floor(fracX * extent), Math.floor(fracY * extent)];

            // If we have an R-tree index for this provider, use it to find the feature that
            // contains the point. Otherwise, iterate over all features in the layer.
            if (provider in data.indexes) {
                const index = data.indexes[provider];
                const featureIndex = index
                    .search(tileX, tileY, tileX, tileY, (i) => {
                        const geometry = layer.feature(i).loadGeometry();
                        return geometry.some((ring) => {
                            const polygon = ring.map((point) => [point.x, point.y]);
                            return pointInPolygon([tileX, tileY], polygon);
                        });
                    })
                    .at(0);

                if (featureIndex === undefined) {
                    resolve(null);
                } else {
                    const {tech} = layer.feature(featureIndex).properties;
                    resolve(isCellCoverage(tech) ? tech : null);
                }
            } else {
                for (let i = 0; i < layer.length; i++) {
                    const feature = layer.feature(i);

                    for (const ring of feature.loadGeometry()) {
                        const polygon = ring.map((point) => [point.x, point.y]);

                        if (pointInPolygon([tileX, tileY], polygon)) {
                            const {tech} = feature.properties;
                            return resolve(isCellCoverage(tech) ? tech : null);
                        }
                    }
                }

                resolve(null);
            }
        });
    });
}
