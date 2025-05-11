const axios = require('axios');

async function fetchBusStops() {
    let request = await axios.get(`${process.env.BUSINFO_API_URL}/PoiService.svc/${process.env.BUSINFO_API_TOWN}/GetPoiList/`);
    global.busStopsDb = request.data;

    const gridSize = 0.01;
    global.busStopsChunksDb = {};

    busStopsDb.forEach((stop) => {
        const lat = Math.floor(stop.Y / gridSize);
        const lon = Math.floor(stop.X / gridSize);
        const gridKey = `${lat},${lon}`;

        if (!global.busStopsChunksDb[gridKey]) {
            global.busStopsChunksDb[gridKey] = [];
        }
        global.busStopsChunksDb[gridKey].push(stop);
    });

    console.log("Base de données initialisée :", global.busStopsDb.length, "arrêts de bus chargés.");
    return 1;
}

async function autoUpdateBusStops() {
    await fetchBusStops();

    setInterval(async () => {
        await fetchBusStops();
    }, 5 * 60 * 60 * 1000); // 5 heures en millisecondes
}

module.exports = { autoUpdateBusStops };