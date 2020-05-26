const {addElevation} = require('geojson-elevation');
const GaiaTileSet = require('./GaiaTileSet');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 5001;

const tileDirectory = process.env.TILE_DIRECTORY || './data';

const tiles = new GaiaTileSet(tileDirectory);
const noData = process.env.NO_DATA ? parseInt(process.env.NO_DATA) : undefined;

app.use(bodyParser.json({limit: process.env.MAX_POST_SIZE || '500kb'}));

app.use((error, req, res, next) => {
    if (error.type === 'entity.too.large') {
        return res.status(413).json({'Error': 'Request payload too large'});
    } else if (error.type === 'aborted') {
        return res.status(400).json({'Error': 'Request aborted'});
    }
    next();
})

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

app.post('/geojson', (req, res) => {
    const geojson = req.body;

    if (!geojson || Object.keys(geojson).length === 0) {
        res.status(400).json({'Error': 'invalid geojson'});
        return;
    }

    addElevation(geojson, tiles, (err) => {
        if (err) {
            console.log(err);
            return res.status(500).json(err);
        }
        res.json(geojson);
    }, noData);
});

app.get('/status', (req, res) => {
    res.json({'success': true});
});

app.listen(port, () => { console.log(`elevation-server listening on port ${port}`); });
