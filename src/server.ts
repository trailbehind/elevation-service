import 'dotenv/config';

import {GaiaTileSet} from './GaiaTileSet/index.js';
import cors from '@fastify/cors';
import Fastify from 'fastify';
import {Feature, FeatureCollection, Geometry} from 'geojson';

const port = parseInt(process.env.PORT!);
const tiles = new GaiaTileSet(process.env.TILE_DIRECTORY!);
const connectionTimeout = parseInt(process.env.CONNECTION_TIMEOUT!);
const keepAliveTimeout = parseInt(process.env.KEEP_ALIVE_TIMEOUT!);
const bodyLimit = parseInt(process.env.MAX_POST_SIZE!);

const fastify = Fastify({
    logger: true,
    ignoreTrailingSlash: true,
    disableRequestLogging: true,
    // 500kb
    bodyLimit,
    connectionTimeout,
    keepAliveTimeout,
    exposeHeadRoutes: true,
});

// Add header for connection timeout to all responses
fastify.server.headersTimeout = connectionTimeout;

await fastify.register(cors, {
    origin: (origin, cb) => {
        switch (origin) {
            case 'http://localhost:8000':
            case 'https://www.gaiagps.com':
            case 'https://www-staging.gaiagps.com':
                return cb(null, origin);
            default:
                return cb(new Error('Not allowed'), []);
        }
    },
    methods: ['GET', 'OPTIONS'],
    allowedHeaders: ['Origin', 'Content-Type', 'Accept'],
    maxAge: 300,
});

fastify.addHook('onTimeout', async (_request, reply) => {
    await reply.code(500).send({Error: 'Request timed out'});
});

fastify.post('/geojson', async (req, reply) => {
    const geojson = req.body;

    if (!isGeoJson(geojson)) {
        return reply.code(400).send({Error: 'invalid geojson'});
    }

    const start = process.hrtime.bigint();

    try {
        const output = await new Promise<typeof geojson>((resolve, reject) => {
            tiles.addElevation(geojson, (error, output) => {
                if (error) reject(error);
                else resolve(output!);
            });
        });

        await reply.send(output);
    } catch (error) {
        fastify.log.error(error);
        await reply.code(500).send({Error: 'Elevation unavailable'});
    }

    const ms = Number((process.hrtime.bigint() - start) / 1_000_000n);
    if (ms > 1_000) {
        console.log(`Adding elevation took ${(ms / 1_000).toFixed(3)}s`);
        console.log(JSON.stringify(geojson));
    }
});

fastify.get('/status', (_request, reply) => reply.status(204).send());

try {
    await fastify.listen({port, host: '0.0.0.0'});
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
