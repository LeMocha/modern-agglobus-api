const express = require('express');

// Importation des modules nécessaires
const { autoUpdateBusStops } = require('./bin/busStopTools.js');
const { getInfo } = require('./bin/getInfo.js');

// Initialisation de la base de données
global.busStopsDb = [];
global.busStopsChunksDb = {};

// Config
require('dotenv').config();

const app = express();
const port = 5000;

app.get('/bus-stops', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(busStopsDb));
})

app.get('/bus-stop/:ShortName', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    let response = await getInfo('stop', req.params.ShortName);
    res.send(response)
})

app.get('/bus-stops-chunks', (req, res) => {
    const { minLat, maxLat, minLon, maxLon } = req.query;

    const chunkSize = 0.01;
    const visibleStops = [];

    for (let lat = Math.floor(minLat / chunkSize); lat <= Math.floor(maxLat / chunkSize); lat++) {
        for (let lon = Math.floor(minLon / chunkSize); lon <= Math.floor(maxLon / chunkSize); lon++) {
            const gridKey = `${lat},${lon}`;
            if (global.busStopsChunksDb[gridKey]) {
                visibleStops.push(...global.busStopsChunksDb[gridKey]);
            }
        }
    }

    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(visibleStops));
});

app.get('/locate/:busId', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    let response = await getInfo('location', req.params.busId);
    res.send(response);
})

// Redirection vers Apple Maps pour la localisation d'un bus (le temps qu'un client soit développé)
app.get('/locate-url/:busId', async (req, res) => {
    res.setHeader('Content-Type', 'application/text');
    let response = await getInfo('location', req.params.busId);
    response = `https://maps.apple.com/?q=${response.Lat},${response.Lon}&z=15`;
    res.send(response);
});

// Tout le trafic qui n'est pas géré tombe ici
app.all('*', (req, res) => {
    res.status(404);
    res.send(`Not found.`);
});

app.listen(port, async () => {
    console.log(`Serveur démarré sur http://localhost:${port}`);
    console.log("Téléchargement de la base de données en cours...");
    await autoUpdateBusStops();
});