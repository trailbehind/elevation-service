import {pointToTileFraction} from '@mapbox/tilebelt';
import type {Position} from 'geojson';
import {type CellCoverage, type CellProvider, type PixelCoordinate} from '../types.js';
import {fetchCellCoverageTile} from './fetchCellCoverageTile.js';
import {getPointCoverageFromTile} from './getPointCoverageFromTile.js';

const MAX_ZOOM = 10; // current highest zoom level for Gaia cell coverage tiles

export async function getCellCoverage(
    coords: Position[],
    provider: CellProvider = 'all',
): Promise<CellCoverage[]> {
    const pixelCoords: PixelCoordinate[] = coords.map(([lng, lat]) => {
        const [x, y, z] = pointToTileFraction(lng, lat, MAX_ZOOM);
        return [x, y, z];
    });

    const cellCoverage = await Promise.all(
        pixelCoords.map(async (pixelCoord) => {
            const tile = await fetchCellCoverageTile(pixelCoord);
            return getPointCoverageFromTile(tile, provider, pixelCoord);
        }),
    );

    return cellCoverage;
}
