elevation-service
=================

Elevation data for your GeoJSON as a micro service. Yes, really!

You can try it out in [the elevation-service demo app](http://www.liedman.net/elevation-service/).

You might also be interested in [geojson-elevation](https://github.com/perliedman/geojson-elevation) and
[node-hgt](https://github.com/perliedman/node-hgt), which this module builds upon.

## Installation and running

Clone this repo, install dependencies:

```
npm install
```

and fire it up:

```
node index.js
```

It runs on port 5001 by default.

Post a GeoJSON object to its only endpoint, `/geojson`, and you will get the same object back, but its
coordinates will have a third component containing elevation added.


#### With Docker

````bash
docker build -t gaiagps/elevation-service .
docker run --publish 5001:5001 -d --name elevation-service gaiagps/elevation-service:latest
````

#### Environment

- `PORT`: default `5001`
- `TILE_DIRECTORY`: default `./data`
- `TILE_DOWNLOADER`: default `undefined`
- `NO_DATA`: default `undefined`
- `MAX_POST_SIZE`: default `500kb`
