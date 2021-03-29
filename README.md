# elevation-service

https://app.codeship.com/projects/ddd3fa70-7c16-0138-df4f-2eb71819488e/status?branch=master

Forked from https://github.com/perliedman/elevation-service

## Installation and running

#### Locally

````bash
npm install
node index.js
````

#### With Docker

````bash
docker build -t gaiagps/elevation-service .
docker run --publish 5001:5001 -d --name elevation-service gaiagps/elevation-service:latest
````

## Usage

Post a GeoJSON object to `/geojson`, and you will get the same object back, but its
coordinates will have a third component containing elevation added.

You can check the health of the server with the `/status` endpoint.


## Testing

````bash
npm install
npm run test
````

#### Environment

- `PORT`: default `5001`
- `TILE_DIRECTORY`: default `./data`
- `TILE_DOWNLOADER`: default `undefined`
- `NO_DATA`: default `undefined`
- `MAX_POST_SIZE`: default `500kb`
