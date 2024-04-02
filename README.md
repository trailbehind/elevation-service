# elevation-service

https://app.codeship.com/projects/ddd3fa70-7c16-0138-df4f-2eb71819488e/status?branch=master

Forked from https://github.com/perliedman/elevation-service

## Installation and running

#### Locally

1. Create a `.env` file in the project root with the following content:

```env
PORT="5001"
TILE_DIRECTORY="elevation-server-data"
CONNECTION_TIMEOUT="70000"
KEEP_ALIVE_TIMEOUT="65000"
MAX_POST_SIZE="500000"
AWS_REGION="us-east-1"
AWS_ELEVATION_BUCKET="com.gaiagps.dem"
```

2. Install dependencies:

```bash
npm install
```

3. Start the server:

```bash
npm start
```

#### With Docker

There is no need to run the Docker image locally; GaiaCloud will work directly with the elevation service running on "bare metal" via `npm start`.

But, if you insist, to use the GaiaCloud `docker-compose-services/elevation.yml` service, you will need to build the Docker image with a specific tag.

```bash
docker build -t gaiagps/elevation-service .
```

Then, start the GaiaCloud backend with the service file:

```bash
docker compose -f docker-compose.yml -f docker-compose-services/elevation.yml up
```

Then, separately start the frontend with the elevation service configured:

```bash
LOCAL_SERVICES=elevation pnpm start:frontend
```

## Usage

Post a GeoJSON object to `/geojson`, and you will get the same object back, but its
coordinates will have a third component containing elevation added.

You can check the health of the server with the `/status` endpoint.

## Testing

```bash
npm install
npm run test
```

#### Environment

See the `.env` contents above.
