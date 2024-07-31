import type {Feature, FeatureCollection, Geometry} from 'geojson';

export type PolylinePoint = {
    type: 'Point';
    coordinates: string;
};

export type PolylineLineString = {
    type: 'LineString';
    coordinates: string;
};

export type PolylineMultiLineString = {
    type: 'MultiLineString';
    coordinates: string[];
};

/**
 * Shallow duck-typing
 */
export function isGeoJson(geojson: unknown): geojson is FeatureCollection | Feature | Geometry {
    if (typeof geojson !== 'object' || geojson === null) return false;

    if (!('type' in geojson)) return false;

    switch (geojson.type) {
        case 'FeatureCollection':
            return true;

        case 'Feature':
            return true;

        case 'Point':
        case 'MultiPoint':
        case 'LineString':
        case 'MultiLineString':
        case 'Polygon':
        case 'MultiPolygon':
        case 'GeometryCollection':
            return true;

        default:
            return false;
    }
}
