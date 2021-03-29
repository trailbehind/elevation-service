const fs = require('fs');
const THREE_ARC_SECOND = 1442401 * 2;
const ONE_ARC_SECOND = 12967201 * 2;

// Adapted from https://github.com/perliedman/node-hgt/blob/master/src/hgt.js
function HGT(path, swLngLat, options, callback) {
    // Make sure the file exists
    fs.open(path, 'r', (error, fd) => {
        setImmediate(() => {
            if (error) return callback(error);

            // Determine the type of HGT file based on the size of the file
            fs.fstat(fd, (error, stats) => {
                setImmediate(() => {
                    if (error) return callback(error);
                    const [resError, resAndSize] = getResolutionAndSize(stats.size);
                    if (resError) return callback(resError);

                    // Stream the file contents to a Buffer
                    getHGTBuffer(path, (error, buffer) => {
                        setImmediate(() => {
                            if (error) return callback(error);
                            callback(undefined, {
                                buffer,
                                resolution: resAndSize.resolution,
                                size: resAndSize.size,
                                options,
                                swLngLat,
                            });
                        });
                    });
                });
            });
        });
    });
}

// Via https://github.com/perliedman/node-hgt/blob/master/src/hgt.js#L16
function getResolutionAndSize(size) {
    if (size === ONE_ARC_SECOND) {
        return [undefined, {
            resolution: 1,
            size: 3601,
        }];
    } else if (size === THREE_ARC_SECOND) {
        return [undefined, {
            resolution: 3,
            size: 1201,
        }];
    } else {
        return ['Unknown tile format (1 arcsecond and 3 arcsecond supported).'];
    }
}

// Stream an HGT file into a buffer
function getHGTBuffer(fileDescriptor, callback) {
    const readStream = fs.createReadStream(fileDescriptor);

    let buffer = [];
    readStream
        .on('data', (chunk) => buffer.push(chunk))
        .on('error', () => callback('Unable to read buffer', null))
        .on('end', () => callback(null, Buffer.concat(buffer)));
}

module.exports = HGT;