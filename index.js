const GaiaTileSet = require('./GaiaTileSet');

const fastify = require('fastify')({
    logger: true,
    ignoreTrailingSlash: true,
    disableRequestLogging: true,
    // 500kb
    bodyLimit: process.env.MAX_POST_SIZE || 500000,
    connectionTimeout: 10000,
    keepAliveTimeout: 5000,
});

fastify.register(require('fastify-cors', {
    origin: '*',
    methods: ['GET', 'OPTIONS', 'POST'],
    allowedHeaders: 'Origin, X-Requested-With, Content-Type, Accept',
}))

fastify.addHook('onTimeout', (request, reply, done) => {
    reply.code(500).send({'Error': 'Request timed out'})
})

const port = process.env.PORT || 5001;
const tileDirectory = process.env.TILE_DIRECTORY || './data';
const tiles = new GaiaTileSet(tileDirectory);

fastify.post('/geojson', (req, reply) => {
    const geojson = req.body;

    if (!geojson || Object.keys(geojson).length === 0) {
        reply.code(400).send({'Error': 'invalid geojson'});
        return;
    }

    tiles.addElevation(geojson, (error, output) => setImmediate(() => {
        if (error) {
            fastify.log.error(error)
            return reply.code(500).send({'Error': 'Elevation unavailable'});
        }

        reply.send(output);
    }));
});

fastify.get('/status', (req, reply) => {
    reply.send({'success': true});
});

(async () => {
    try {
        await fastify.listen(port)
        fastify.log.info(`elevation-server listening on port ${port}`)
    } catch (error) {
        fastify.log.error(error)
        process.exit(1)
    }
})()
