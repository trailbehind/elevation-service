import 'dotenv/config';

import compress from '@fastify/compress';
import cors from '@fastify/cors';
import polyline from '@mapbox/polyline';
import Fastify from 'fastify';
import geobuf from 'geobuf';
import type {GeoJSON, LineString, MultiLineString, Point} from 'geojson';
import Pbf from 'pbf';
import {addElevation} from './elevation/addElevation.js';
import {getTerrariumDemElevation} from './elevation/getTerrariumDemElevation.js';
import {isGeoJson, isPolylineEncoded} from './types.js';

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

/**
 * {@link https://fastify.dev/docs/latest/Reference/ContentTypeParser/#custom-parser-options | Fastify docs}
 * claim that `parseAs: 'buffer'` is the default, but it is not; this throws errors if not explicit.
 * The type signature for the `async` form of the handler is also incorrect or incomplete.
 */
fastify.addContentTypeParser(
    'application/x-protobuf',
    {parseAs: 'buffer'},
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
await fastify.register(compress, {customTypes: /^application\/(x-protobuf|x-terrarium-dem|json)$/});

fastify.addHook('onTimeout', async (_request, reply) => {
    reply.code(500);
    return timeout;
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
        return unavailable;
    }
});

fastify.post('/polyline', async (request, reply) => {
    try {
        const polylineGeoJson = request.body;

        if (!isPolylineEncoded(polylineGeoJson)) throw badRequest;

        let geoJson: Point | LineString | MultiLineString;

        if (polylineGeoJson.type === 'Point') {
            geoJson = {
                type: 'Point',
                coordinates: polyline.toGeoJSON(polylineGeoJson.coordinates).coordinates[0],
            };
        } else if (polylineGeoJson.type === 'LineString') {
            geoJson = polyline.toGeoJSON(polylineGeoJson.coordinates);
        } else {
            geoJson = {
                type: 'MultiLineString',
                coordinates: polylineGeoJson.coordinates.map(
                    (line) => polyline.toGeoJSON(line).coordinates,
                ),
            };
        }

        reply.type('application/x-terrarium-dem');

        return getTerrariumDemElevation(geoJson);
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
});

fastify.post('/geojson', async (request, reply) => {
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
});

fastify.get('/status', async (_request, reply) => reply.send({success: true}));

try {
    await fastify.listen({port, host: '0.0.0.0'});
} catch (error) {
    fastify.log.error(error);
    process.exit(1);
}
