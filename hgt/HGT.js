const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const THREE_ARC_SECOND = 1442401 * 2;
const ONE_ARC_SECOND = 12967201 * 2;

const s3Client = new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
});

// Adapted from https://github.com/perliedman/node-hgt/blob/master/src/hgt.js
function HGT(path, swLngLat, options, callback) {
    s3Client
        .send(
            new GetObjectCommand({
                Bucket: process.env.AWS_ELEVATION_BUCKET,
                Key: path,
            })
        )
        .then(async (dem) => {
            const [resError, resAndSize] = getResolutionAndSize(
                dem.ContentLength
            );
            if (resError) return callback(resError);

            const buffer = await streamToBuffer(dem.Body);
            return callback(undefined, {
                buffer,
                resolution: resAndSize.resolution,
                size: resAndSize.size,
                options,
                swLngLat,
            });
        })
        .catch((error) => {
            console.log(`Error fetching tile ${path}`, error);
            callback(`Error fetching tile ${path}`);
        });
}

// Via https://github.com/perliedman/node-hgt/blob/master/src/hgt.js#L16
function getResolutionAndSize(size) {
    if (size === ONE_ARC_SECOND) {
        return [
            undefined,
            {
                resolution: 1,
                size: 3601,
            },
        ];
    } else if (size === THREE_ARC_SECOND) {
        return [
            undefined,
            {
                resolution: 3,
                size: 1201,
            },
        ];
    } else {
        return ["Unknown tile format (1 arcsecond and 3 arcsecond supported)."];
    }
}

// Stream an HGT file from S3 into a buffer
const streamToBuffer = (stream) =>
    new Promise((resolve, reject) => {
        const chunks = [];
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("error", reject);
        stream.on("end", () => resolve(Buffer.concat(chunks)));
    });

module.exports = HGT;
