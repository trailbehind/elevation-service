import {pointToTileFraction as getWorldCoords} from '@mapbox/tilebelt';
import type {Position} from 'geojson';
import {type CellCoverage, type CellProvider} from '../types.js';
import {fetchCellCoverageTile} from './fetchCellCoverageTile.js';
import {getPointCoverageFromTile} from './getPointCoverageFromTile.js';

const MAX_ZOOM = 10; // current highest zoom level for Gaia cell coverage tiles

export async function getCellCoverage(
    coords: Position[],
    provider: CellProvider = 'all',
): Promise<CellCoverage[]> {
    const worldCoords = coords.map(
        ([lng, lat]) => getWorldCoords(lng, lat, MAX_ZOOM) as [x: number, y: number, z: number],
    );

    const cellCoverage = await Promise.all(
        worldCoords.map(async (worldCoord) => {
            const tile = await fetchCellCoverageTile(worldCoord);
            return getPointCoverageFromTile(tile, provider, worldCoord);
        }),
    );

    return cellCoverage;
}
