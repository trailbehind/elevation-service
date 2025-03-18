import {PutObjectCommand, S3Client} from '@aws-sdk/client-s3';
import {fastify} from './server.js';

const LOG_SIZE_THRESHOLD = 5_000_000; // 5 megabytes of `request.body`s

type Request = {type: 'polyline' | 'geojson'; body: string};

let requests: Request[] = [];
let len = 0;

const client = new S3Client({region: process.env.AWS_REGION});
const Bucket = 'com.gaiagps.dem';
const prefix = 'logs/';

export function log(request: Request): void {
    len += request.body.length;
    requests.push(request);

    if (len >= LOG_SIZE_THRESHOLD) {
        flush(JSON.stringify(requests)).catch(fastify.log.error);
        requests = [];
        len = 0;
    }
}

function flush(Body: string) {
    const Key = `${prefix}${new Date().toISOString()}.json`;
    fastify.log.info('flushing log to S3');
    return client.send(new PutObjectCommand({Bucket, Key, Body}));
}
