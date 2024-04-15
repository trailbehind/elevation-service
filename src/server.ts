import 'dotenv/config';

import cors from '@fastify/cors';
import Fastify from 'fastify';
import type {Feature, FeatureCollection, Geometry} from 'geojson';
import {addElevation} from './elevation/addElevation.js';

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

await fastify.register(cors, {
    origin: true,
    methods: ['GET', 'OPTIONS'],
    allowedHeaders: ['Origin', 'Content-Type', 'Accept'],
    maxAge: 300,
});

fastify.addHook('onTimeout', async (_request, reply) => {
    await reply.code(500).send({Error: 'Request timed out'});
});

fastify.post('/geojson', async (request, reply) => {
    const geoJson = request.body;

    if (!isGeoJson(geoJson)) {
        return reply.code(400).send({Error: 'invalid geojson'});
    }

    try {
        await addElevation(geoJson);
        await reply.send(geoJson);
    } catch (error) {
        fastify.log.error(error);
        await reply.code(500).send({Error: 'Elevation unavailable'});
    }
});

fastify.get('/status', async (_request, reply) => reply.send({success: true}));

try {
    await fastify.listen({port});
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
