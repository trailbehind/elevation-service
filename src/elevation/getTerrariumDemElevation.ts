import {coordAll} from '@turf/meta';
import type {Geometry} from 'geojson';
import {getElevation} from './getElevation.js';

export async function getTerrariumDemElevation(geometry: Geometry): Promise<Uint8Array> {
    const coords = coordAll(geometry);

    const bytes = new Uint8Array(coords.length * 3);

    await Promise.all(
        coords.map((coord, i) =>
            getElevation(coord).then((elev) => {
                const offset = i * 3;
                elev += 32768;
                bytes[offset] = Math.floor(elev / 256);
                bytes[offset + 1] = elev % 256;
                bytes[offset + 2] = Math.floor((elev - Math.floor(elev)) * 256);
            }),
        ),
    );

    return bytes;
}
