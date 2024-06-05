import 'dotenv/config';

import 'dd-trace/init';
import cors from '@fastify/cors';
import Fastify from 'fastify';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { addElevation } from './elevation/addElevation.js';
import compress from '@fastify/compress';
import geobuf from 'geobuf';
import Pbf from 'pbf';
import type { GeoJSON } from 'geojson';

const port = parseInt(process.env.PORT!);
const connectionTimeout = parseInt(process.env.CONNECTION_TIMEOUT!);
const keepAliveTimeout = parseInt(process.env.KEEP_ALIVE_TIMEOUT!);
const bodyLimit = parseInt(process.env.MAX_POST_SIZE!);

export const fastify = Fastify({
    logger: true,
    ignoreTrailingSlash: true,
    disableRequestLogging: true,
    // 500kb
    bodyLimit,
    connectionTimeout,
    keepAliveTimeout,
});

// Add header for connection timeout to all responses
fastify.server.headersTimeout = connectionTimeout;

/**
 * {@link https://fastify.dev/docs/latest/Reference/ContentTypeParser/#custom-parser-options | Fastify docs}
 * claim that `parseAs: 'buffer'` is the default, but it is not; this throws errors if not explicit.
 * The type signature for the `async` form of the handler is also incorrect or incomplete.
 */
fastify.addContentTypeParser(
    'application/x-protobuf',
    { parseAs: 'buffer' },
    // @ts-expect-error type signature is incorrect or incomplete
    async (_request, body) => {
        return geobuf.decode(new Pbf(body as Buffer));
    },
);

await fastify.register(cors, {
    origin: true,
    methods: ['GET', 'OPTIONS'],
    allowedHeaders: ['Origin', 'Content-Type', 'Content-Encoding', 'Accept'],
    maxAge: 300,
});

/**
 * {@link https://github.com/fastify/fastify-compress?tab=readme-ov-file#customtypes | customTypes}
 * _replaces_ the default types, so we must enumerate everything we want to support.
 */
await fastify.register(compress, { customTypes: /^application\/(x-protobuf|json)$/ });

fastify.addHook('onTimeout', async (_request, reply) => {
    reply.code(500);
    return { Error: 'Request timed out' };
});

fastify.post('/geobuf', async (request, reply) => {
    try {
        const geoJson = request.body as GeoJSON;
        await addElevation(geoJson);
        reply.type('application/x-protobuf');
        return geobuf.encode(geoJson, new Pbf());
    } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { Error: 'Elevation unavailable' };
    }
});

fastify.post('/geojson', async (request, reply) => {
    const geoJson = request.body;

    if (!isGeoJson(geoJson)) {
        reply.code(400);
        return { Error: 'invalid geojson' };
    }

    try {
        await addElevation(geoJson);
        return geoJson;
    } catch (error) {
        reply.code(500);
        return { Error: 'Elevation unavailable' };
    }
});

fastify.get('/status', async (_request, reply) => reply.send({ success: true }));

try {
    await fastify.listen({ port, host: '0.0.0.0' });
} catch (error) {
    fastify.log.error(error);
    process.exit(1);
}

/**
 * Shallow duck-typing
 */
function isGeoJson(geojson: unknown): geojson is FeatureCollection | Feature | Geometry {
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
