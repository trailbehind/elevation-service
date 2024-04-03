import 'dotenv/config';

import {GaiaTileSet} from './GaiaTileSet/index.js';
import cors from '@fastify/cors';
import Fastify from 'fastify';

const port = parseInt(process.env.PORT);
const tiles = new GaiaTileSet(process.env.TILE_DIRECTORY);
const connectionTimeout = parseInt(process.env.CONNECTION_TIMEOUT);
const keepAliveTimeout = parseInt(process.env.KEEP_ALIVE_TIMEOUT);
const bodyLimit = parseInt(process.env.MAX_POST_SIZE);

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

fastify.register(cors, {
    origin: '*',
    methods: ['GET', 'OPTIONS'],
    allowedHeaders: 'Origin, X-Requested-With, Content-Type, Accept',
    maxAge: 300,
});

fastify.addHook('onTimeout', (_request, reply) => {
    reply.code(500).send({Error: 'Request timed out'});
});

fastify.post('/geojson', (req, reply) => {
    const geojson = req.body;

    if (!geojson || Object.keys(geojson).length === 0) {
        return reply.code(400).send({Error: 'invalid geojson'});
    }

    const start = process.hrtime.bigint();
    tiles.addElevation(geojson, (error, output) =>
        setImmediate(() => {
            const ms = Number((process.hrtime.bigint() - start) / 1_000_000n);
            if (ms > 1_000) {
                console.log(`Adding elevation took ${(ms / 1_000).toFixed(3)}s`);
                console.log(JSON.stringify(geojson));
            }
            if (error) {
                fastify.log.error(error);
                reply.code(500).send({Error: 'Elevation unavailable'});
            } else {
                reply.send(output);
            }
        }),
    );
});

fastify.get('/status', (_request, reply) => reply.status(204).send());

try {
    fastify.listen({port, host: '0.0.0.0'});
    fastify.log.info(`elevation-server listening on port ${port}`);
} catch (error) {
    fastify.log.error(error);
    process.exit(1);
}
