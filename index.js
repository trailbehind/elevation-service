const {addElevation} = require('geojson-elevation');
const {TileSet, ImagicoElevationDownloader} = require('node-hgt');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 5001;

const tileDirectory = process.env.TILE_DIRECTORY || './data';

let tileDownloader;
if (!process.env.TILE_DOWNLOADER && process.env.TILE_DOWNLOADER === 'imagico') {
    tileDownloader = new ImagicoElevationDownloader(tileDirectory);
} else if (process.env.TILE_DOWNLOADER === 'none') {
    tileDownloader = undefined;
}

const tiles = new TileSet(tileDirectory, {downloader:tileDownloader});
const noData = process.env.NO_DATA ? parseInt(process.env.NO_DATA) : undefined;

app.use(bodyParser.json({limit: process.env.MAX_POST_SIZE || '500kb'}));

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.contentType('application/json');
    next();
});

app.post('/geojson', (req, res) => {
    const geojson = req.body;

    if (!geojson || Object.keys(geojson).length === 0) {
        res.status(400).send('Error: invalid geojson.');
        return;
    }

    addElevation(geojson, tiles, (err) => {
        if (err) return res.status(500).send(err);
        res.json(geojson);
    }, noData);
});

app.get('/status', (req, res) => {
    res.send();
});

app.listen(port, () => { console.log(`elevation-server listening on port ${port}`); });
