const GaiaTileSet = require("./GaiaTileSet");
const cors = require("@fastify/cors");

const DEFAULT_CONNECTION_TIMEOUT = 70000;
// ELB's default keep alive is 60s, and this must be greater than that
const DEFAULT_KEEP_ALIVE_TIMEOUT = 61000;

let CONNECTION_TIMEOUT =
    process.env.CONNECTION_TIMEOUT || DEFAULT_CONNECTION_TIMEOUT;
let KEEP_ALIVE_TIMEOUT =
    process.env.KEEP_ALIVE_TIMEOUT || DEFAULT_KEEP_ALIVE_TIMEOUT;

if (KEEP_ALIVE_TIMEOUT >= CONNECTION_TIMEOUT) {
    console.log(
        "Ignoring CONNECTION_TIMEOUT amd KEEP_ALIVE_TIMEOUT because KEEP_ALIVE_TIMEOUT exceeds the CONNECTION_TIMEOUT"
    );
    CONNECTION_TIMEOUT = DEFAULT_CONNECTION_TIMEOUT;
    KEEP_ALIVE_TIMEOUT = DEFAULT_KEEP_ALIVE_TIMEOUT;
}

const fastify = require("fastify")({
    logger: true,
    ignoreTrailingSlash: true,
    disableRequestLogging: true,
    // 500kb
    bodyLimit: process.env.MAX_POST_SIZE || 500000,
    connectionTimeout: CONNECTION_TIMEOUT,
    keepAliveTimeout: KEEP_ALIVE_TIMEOUT,
    exposeHeadRoutes: true,
});

// Add header for connection timeout to all responses
fastify.server.headersTimeout = CONNECTION_TIMEOUT;

fastify.register(cors, {
    origin: "*",
    methods: ["GET", "OPTIONS"],
    allowedHeaders: "Origin, X-Requested-With, Content-Type, Accept",
    maxAge: 300,
});

fastify.addHook("onTimeout", (_request, reply, _done) => {
    reply.code(500).send({ Error: "Request timed out" });
});

const port = process.env.PORT || 5001;
const tileDirectory = process.env.TILE_DIRECTORY || "./data";
const tiles = new GaiaTileSet(tileDirectory);

fastify.post("/geojson", (req, reply) => {
    const geojson = req.body;

    if (!geojson || Object.keys(geojson).length === 0) {
        reply.code(400).send({ Error: "invalid geojson" });
        return;
    }
    const start = process.hrtime();
    tiles.addElevation(geojson, (error, output) =>
        setImmediate(() => {
            const end = process.hrtime(start);
            if (end[0] > 1) {
                console.log(
                    `Adding elevation took ${end[0]}s ${Math.round(
                        end[1] / 1000000
                    )}ms`
                );
                console.log(JSON.stringify(geojson));
            }
            if (error) {
                fastify.log.error(error);
                reply.code(500).send({ Error: "Elevation unavailable" });
            } else {
                reply.send(output);
            }
        })
    );
});

fastify.get("/status", (_req, reply) => {
    reply.status(204).send();
});

(async () => {
    try {
        fastify.listen({ port, host: "0.0.0.0" });
        fastify.log.info(`elevation-server listening on port ${port}`);
    } catch (error) {
        fastify.log.error(error);
        process.exit(1);
    }
})();
