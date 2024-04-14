export function getCellCoverageTileUrl(worldCoord: [x: number, y: number, z: number]): string {
    const [x, y, z] = [Math.floor(worldCoord[0]), Math.floor(worldCoord[1]), worldCoord[2]];
    return `https://outside-maps.com/tiles/fcc-bdc/${z}/${x}/${y}.pbf`;
}
