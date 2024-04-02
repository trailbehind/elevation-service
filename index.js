import { GaiaTileSet } from "./GaiaTileSet.js";
import cors from "@fastify/cors";
import Fastify from "fastify";

const port = process.env.PORT ?? 5001;
const tileDirectory = process.env.TILE_DIRECTORY ?? "elevation-server-data";
const tiles = new GaiaTileSet(tileDirectory);

const CONNECTION_TIMEOUT = process.env.CONNECTION_TIMEOUT ?? 70_000;

const KEEP_ALIVE_TIMEOUT = process.env.KEEP_ALIVE_TIMEOUT ?? 65_000;

const fastify = Fastify({
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

fastify.addHook("onTimeout", (_request, reply) => {
    reply.code(500).send({ Error: "Request timed out" });
});

fastify.post("/geojson", (req, reply) => {
    const geojson = req.body;

    if (!geojson || Object.keys(geojson).length === 0) {
        return reply.code(400).send({ Error: "invalid geojson" });
    }

    const start = process.hrtime.bigint();
    tiles.addElevation(geojson, (error, output) =>
        setImmediate(() => {
            const ms = Number((process.hrtime.bigint() - start) / 1_000_000n);
            if (ms > 1_000) {
                console.log(
                    `Adding elevation took ${(ms / 1_000).toFixed(3)}s`
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

fastify.get("/status", (_request, reply) => reply.status(204).send());

try {
    fastify.listen({ port, host: "0.0.0.0" });
    fastify.log.info(`elevation-server listening on port ${port}`);
} catch (error) {
    fastify.log.error(error);
    process.exit(1);
}
