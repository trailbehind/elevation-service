type HGTTileKey = `${'N' | 'S'}${string}${'E' | 'W'}${string}`;

export function getElevationTileKey(lngDegrees: number, latDegrees: number): HGTTileKey {
    const latHemisphere = latDegrees < 0 ? 'S' : 'N';
    const lat = `${Math.abs(latDegrees)}`.padStart(2, '0');
    const lngHemisphere = lngDegrees < 0 ? 'W' : 'E';
    const lng = `${Math.abs(Math.floor(lngDegrees))}`.padStart(3, '0');

    return `${latHemisphere}${lat}${lngHemisphere}${lng}`;
}
