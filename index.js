const fs = require('fs');
const {addElevation} = require('geojson-elevation');
const {TileSet, ImagicoElevationDownloader} = require('node-hgt');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5001;

const tileDirectory = process.env.TILE_DIRECTORY || './data';

const directoryExists = fs.existsSync(tileDirectory);
if (!directoryExists) {
    console.log(`Tile directory ${tileDirectory} does not exist`);
    process.exit(1)
}

let tileDownloader;
if (!process.env.TILE_DOWNLOADER && process.env.TILE_DOWNLOADER === 'imagico') {
    tileDownloader = new ImagicoElevationDownloader(tileDirectory);
} else if (process.env.TILE_DOWNLOADER === 'none') {
    tileDownloader = undefined;
}

const tiles = new TileSet(tileDirectory, {downloader:tileDownloader});
const noData = process.env.NO_DATA ? parseInt(process.env.NO_DATA) : undefined;

app.disable('x-powered-by');

app.use(bodyParser.json({limit: process.env.MAX_POST_SIZE || '500kb'}));

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Enable CORS for preflight OPTIONS requests
app.options('/geojson', cors());

app.post('/geojson', (req, res) => {
    const geojson = req.body;

    if (!geojson || Object.keys(geojson).length === 0) {
        res.status(400).json({'Error': 'invalid geojson'});
        return;
    }

    addElevation(geojson, tiles, (err) => {
        if (err) return res.status(500).json(err);
        res.json(geojson);
    }, noData);
});

app.get('/status', (req, res) => {
    res.json({'success': true});
});

app.listen(port, () => { console.log(`elevation-server listening on port ${port}`); });
