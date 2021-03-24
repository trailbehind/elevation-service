const fs = require('fs');
const _latLng = require('./latlng');

// Adapted from https://github.com/perliedman/node-hgt/blob/master/src/hgt.js
function HGT(path, swLatLng, options, callback) {
    fs.open(path, 'r', (error, fd) => {
        setImmediate(() => {
            if (error) return callback(error);

            fs.fstat(fd, (error, stats) => {
                setImmediate(() => {
                    if (error) return callback(error);
                    const {resolution, size} = getResolutionAndSize(stats.size)

                    getHGTBuffer(path, (error, buffer) => {
                        setImmediate(() => {
                            if (error) return callback(error, null);
                            callback(null, {
                                buffer,
                                resolution,
                                size,
                                options,
                                swLatLng: _latLng(swLatLng),
                            })
                        })

                    });
                });
            });
        });
    });
}

function getResolutionAndSize(size) {
    if (size === 12967201 * 2) {
        return {
            resolution: 1,
            size: 3601,
        }
    } else if (size === 1442401 * 2) {
        return {
            resolution: 3,
            size: 1201,
        }
    } else {
        throw new Error('Unknown tile format (1 arcsecond and 3 arcsecond supported).');
    }
}

// Stream an HGT file into a buffer
function getHGTBuffer(fileDescriptor, callback) {
    const readStream = fs.createReadStream(fileDescriptor);

    let buffer = [];
    readStream
        .on('data', chunk => buffer.push(chunk))
        .on('error', () => callback('Unable to read buffer', null))
        .on('end', () => callback(null, Buffer.concat(buffer)));
}

module.exports = HGT;