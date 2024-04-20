import type {VectorTile} from '@mapbox/vector-tile';
import {cellProviders, type CellCoverageTile} from '../types.js';

export function isCellCoverageTile(tile: VectorTile): tile is CellCoverageTile {
    return cellProviders.every((provider) => provider in tile.layers);
}
