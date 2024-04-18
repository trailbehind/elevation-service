import type {PixelCoordinate} from '../types.js';

export function getCellCoverageTileUrl(pixelCoord: PixelCoordinate): string {
    const [pixelX, pixelY, z] = pixelCoord;
    const [x, y] = [Math.floor(pixelX), Math.floor(pixelY)];
    return `https://outside-maps.com/tiles/fcc-bdc/${z}/${x}/${y}.pbf`;
}
