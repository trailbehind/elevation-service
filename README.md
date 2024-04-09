# elevation-service

https://app.codeship.com/projects/ddd3fa70-7c16-0138-df4f-2eb71819488e/status?branch=master

Forked from https://github.com/perliedman/elevation-service

## Installation and running

#### Locally

1. Create a `.env` file in the project root. While the `.env` does not contain any secrets, it is
bad practice to commit environment variables to the Git repository; therefore, the contents of the
`.env` can be found [in the project Wiki](https://github.com/trailbehind/elevation-service/wiki/Development-dotenv).

2. Install dependencies:

```bash
pnpm install
```

3. Start the server:

```bash
pnpm start
```

#### With Docker

There is no need to run the Docker image locally; GaiaCloud will work directly with the elevation service running on "bare metal" via `pnpm start`.

However, it is still useful to test the Docker image locally to ensure that any changes to the build process will not break in CI or production.

To use the GaiaCloud `docker-compose-services/elevation.yml` service, you will need to build the Docker image with a specific tag.

```bash
docker build -t gaiagps/elevation-service .
```

Then, start the [GaiaCloud](https://github.com/trailbehind/GaiaCloud/) backend with the service file:

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

Tests are written using Node's native test runner, and are intended to run against production (i.e.,
TSC-compiled) code. They use the `.env` environment variable, and also require AWS credentials
(loaded from `~/.aws`).

To run the tests, first build:

```bash
pnpm build
```

Then run:

```bash
pnpm test
```

#### Environment

See the `.env` contents above.
