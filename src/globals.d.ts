/* From https://www.npmjs.com/package/@turf/meta */
declare module '@turf/meta' {
    export type CoordEachCallback = (
        currentCoord: GeoJSON.Position,
        coordIndex: number,
        featureIndex: number,
        multiFeatureIndex: number,
        geometryIndex: number,
    ) => void;

    export function coordAll(
        geojson: GeoJSON.FeatureCollection | GeoJSON.Feature | GeoJSON.Geometry,
    ): GeoJSON.Position[];
    export function coordEach(
        geojson: GeoJSON.FeatureCollection | GeoJSON.Feature | GeoJSON.Geometry,
        callback: CoordEachCallback,
        excludeWrapCoord?: boolean,
    ): void;
}
