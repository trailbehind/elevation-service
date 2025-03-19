import 'dotenv/config';

import compress from '@fastify/compress';
import cors from '@fastify/cors';
import polyline from '@mapbox/polyline';
import Fastify from 'fastify';
import {addElevation} from './elevation/addElevation.js';
import {getTerrariumDemElevation} from './elevation/getTerrariumDemElevation.js';
import {isGeoJson} from './types.js';
import {log} from './logRequest.js';

const port = parseInt(process.env.PORT!);
const connectionTimeout = parseInt(process.env.CONNECTION_TIMEOUT!);
const keepAliveTimeout = parseInt(process.env.KEEP_ALIVE_TIMEOUT!);
const bodyLimit = parseInt(process.env.MAX_POST_SIZE!);

const unavailable = {Error: 'Elevation unavailable'};
const badRequest = {Error: 'Invalid request'};
const timeout = {Error: 'Request timed out'};

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
    allowedHeaders: ['Origin', 'Content-Type', 'Content-Encoding', 'Accept'],
    maxAge: 300,
});

/**
 * {@link https://github.com/fastify/fastify-compress?tab=readme-ov-file#customtypes | customTypes}
 * _replaces_ the default types, so we must enumerate everything we want to support.
 */
await fastify.register(compress, {customTypes: /^application\/(x-terrarium-dem|json)$/});

fastify.addHook('onTimeout', async (_request, reply) => {
    reply.code(500);
    return timeout;
});

fastify.post('/polyline', {
    preHandler: async (request) => {
        if (typeof request.body === 'string') log({type: 'polyline', body: request.body});
    },
    handler: async (request, reply) => {
        try {
            if (typeof request.body !== 'string') throw badRequest;
            reply.type('application/x-terrarium-dem');
            return getTerrariumDemElevation(polyline.toGeoJSON(request.body));
        } catch (err) {
            if (err === badRequest) {
                reply.code(400);
                return badRequest;
            } else {
                fastify.log.error(err);
                reply.code(500);
                return unavailable;
            }
        }
    },
});

fastify.post('/geojson', {
    preHandler: async (request) => {
        if (typeof request.body === 'string') log({type: 'geojson', body: request.body});
    },
    handler: async (request, reply) => {
        try {
            const geoJson = structuredClone(request.body);
            if (!isGeoJson(geoJson)) throw badRequest;
            await addElevation(geoJson);
            return geoJson;
        } catch (error) {
            if (error === badRequest) {
                reply.code(400);
                return badRequest;
            } else {
                fastify.log.error(error);
                reply.code(500);
                return unavailable;
            }
        }
    },
});

fastify.get('/status', async (_request, reply) => reply.send({success: true}));

try {
    await fastify.listen({port, host: '0.0.0.0'});
} catch (error) {
    fastify.log.error(error);
    process.exit(1);
}
