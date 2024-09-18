import './env.js';

import compress from '@fastify/compress';
import cors from '@fastify/cors';
import polyline from '@mapbox/polyline';
import Fastify from 'fastify';
import geobuf from 'geobuf';
import type {GeoJSON} from 'geojson';
import Pbf from 'pbf';
import {addElevation} from './elevation/addElevation.js';
import {getTerrariumDemElevation} from './elevation/getTerrariumDemElevation.js';
import {isGeoJson} from './types.js';

const port = parseInt(process.env.PORT!);
const connectionTimeout = parseInt(process.env.CONNECTION_TIMEOUT!);
const keepAliveTimeout = parseInt(process.env.KEEP_ALIVE_TIMEOUT!);
const bodyLimit = parseInt(process.env.MAX_POST_SIZE!);

const unavailable = {Error: 'Elevation unavailable'};
const badRequest = {Error: 'Invalid request'};
const timeout = {Error: 'Request timed out'};

export const server = Fastify({
    logger: true,
    ignoreTrailingSlash: true,
    disableRequestLogging: true,
    bodyLimit,
    connectionTimeout,
    keepAliveTimeout,
});

// Add header for connection timeout to all responses
server.server.headersTimeout = connectionTimeout;

/**
 * {@link https://fastify.dev/docs/latest/Reference/ContentTypeParser/#custom-parser-options | Fastify docs}
 * claim that `parseAs: 'buffer'` is the default, but it is not; this throws errors if not explicit.
 * The type signature for the `async` form of the handler is also incorrect or incomplete.
 */
server.addContentTypeParser(
    'application/x-protobuf',
    {parseAs: 'buffer'},
    // @ts-expect-error type signature is incorrect or incomplete
    async (_request, body) => {
        return geobuf.decode(new Pbf(body as Buffer));
    },
);

await server.register(cors, {
    origin: true,
    methods: ['GET', 'OPTIONS'],
    allowedHeaders: ['Origin', 'Content-Type', 'Content-Encoding', 'Accept'],
    maxAge: 300,
});

/**
 * {@link https://github.com/fastify/fastify-compress?tab=readme-ov-file#customtypes | customTypes}
 * _replaces_ the default types, so we must enumerate everything we want to support.
 */
await server.register(compress, {customTypes: /^application\/(x-protobuf|x-terrarium-dem|json)$/});

server.addHook('onTimeout', async (_request, reply) => {
    reply.code(500);
    return timeout;
});

server.post('/geobuf', async (request, reply) => {
    try {
        const geoJson = request.body as GeoJSON;
        await addElevation(geoJson);
        reply.type('application/x-protobuf');
        return geobuf.encode(geoJson, new Pbf());
    } catch (error) {
        server.log.error(error);
        reply.code(500);
        return unavailable;
    }
});

server.post('/polyline', async (request, reply) => {
    try {
        if (typeof request.body !== 'string') throw badRequest;
        reply.type('application/x-terrarium-dem');
        return getTerrariumDemElevation(polyline.toGeoJSON(request.body));
    } catch (err) {
        if (err === badRequest) {
            reply.code(400);
            return badRequest;
        } else {
            server.log.error(err);
            reply.code(500);
            return unavailable;
        }
    }
});

server.post('/geojson', async (request, reply) => {
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
            server.log.error(error);
            reply.code(500);
            return unavailable;
        }
    }
});

server.get('/status', async (_request, reply) => reply.send({success: true}));

try {
    await server.listen({port, host: '0.0.0.0'});
} catch (error) {
    server.log.error(error);
    process.exit(1);
}
