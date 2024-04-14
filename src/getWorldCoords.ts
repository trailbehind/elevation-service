import type {Position} from 'geojson';
import {pointToTileFraction} from '@mapbox/tilebelt';

export function getWorldCoords(
    [lng, lat]: Position,
    zoom: number,
): [x: number, y: number, z: number] {
    return pointToTileFraction(lng, lat, zoom) as [number, number, number];
}
