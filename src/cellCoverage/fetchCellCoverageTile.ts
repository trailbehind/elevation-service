import {VectorTile} from '@mapbox/vector-tile';
import Protobuf from 'pbf';
import {BAD_TILE, TILE_MISSING, fetchTileData} from '../fetchTileData.js';
import {
    NO_DATA,
    cellProviders,
    type CellCoverageTile,
    type CellCoverageTileData,
} from '../types.js';
import {urlFetcher} from '../urlFetcher.js';
import {getCellCoverageTileUrl} from './getCellCoverageTileUrl.js';

export async function fetchCellCoverageTile(
    worldCoord: [number, number, number],
): Promise<CellCoverageTile> {
    try {
        const url = getCellCoverageTileUrl(worldCoord);
        const {data} = await fetchTileData(urlFetcher, reader, url);
        return data;
    } catch (ex: unknown) {
        if (ex === TILE_MISSING) throw NO_DATA;
        throw ex;
    }
}

function isCellCoverageTile(tile: VectorTile): tile is CellCoverageTile {
    return cellProviders.every((provider) => provider in tile.layers);
}

function reader(buffer: Buffer): CellCoverageTileData {
    const tile = new VectorTile(new Protobuf(buffer));

    if (!isCellCoverageTile(tile)) throw BAD_TILE;

    return {
        kind: 'cellCoverage',
        bytes: buffer.length,
        data: tile,
    };
}
