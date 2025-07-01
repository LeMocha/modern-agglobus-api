const net = require('net');
const { createClient } = require("redis");
const parseString = require("xml2js").parseString;

async function getInfo(type, key) {
    const client = createClient({ url: 'redis://cache:6379' })
        .on("error", (err) => console.log("Redis Client Error", err));

    await client.connect();

    let response = await client.get(key);

    if (response === null) {
        return new Promise((resolve, reject) => {
            const tcpClient = new net.Socket();

            tcpClient.connect(process.env.BUS_TRACKER_API_PORT, process.env.BUS_TRACKER_API_SERVER, () => {
                if (type === 'stop') {
                    tcpClient.write(`<?xml version="1.0" encoding="utf-8"?><evGetNextTripList_SM_v2><BusStopShortNames><string>${key}</string></BusStopShortNames></evGetNextTripList_SM_v2>`);
                } else {
                    tcpClient.write(`<?xml version="1.0" encoding="utf-8"?><evGetBusPos_v1><BusId>${key}</BusId></evGetBusPos_v1>`);
                }
            });

            tcpClient.on('data', function (data) {
                let res = data.toString();

                parseString(res, function (err, result) {
                    if (err) {
                        console.error("Erreur de parsing XML :", err);
                        reject(err);
                        return;
                    }
                    res = result;

                    let sendedResponse;
                    if (type === 'stop') {
                        sendedResponse = [];
                        for (let busLines in res.evNextTripList_SM_v1.Line[0].string) {
                            sendedResponse.push({ "Line": res.evNextTripList_SM_v1.Line[0].string[busLines] });
                        }
                        for (let busDestinations in res.evNextTripList_SM_v1.Description[0].string) {
                            sendedResponse[busDestinations].destination = res.evNextTripList_SM_v1.Description[0].string[busDestinations];
                        }
                        for (let busPassageTime in res.evNextTripList_SM_v1.Description[0].string) {
                            sendedResponse[busPassageTime].busPassageTime = res.evNextTripList_SM_v1.Time[0].dateTime[busPassageTime];
                        }
                        for (let busId in res.evNextTripList_SM_v1.Description[0].string) {
                            sendedResponse[busId].busId = res.evNextTripList_SM_v1.BusId[0].int[busId];
                        }
                        sendedResponse.push({
                            "NoTripsToday": res.evNextTripList_SM_v1.NoTripsToday[0],
                            "LastTrips": res.evNextTripList_SM_v1.LastTrips[0]
                        });
                    } else {
                        sendedResponse = { busID: res.evBusPos_v1.BusId[0], X: res.evBusPos_v1.X[0], Y: res.evBusPos_v1.Y[0] };
                    }

                    client.set(key, JSON.stringify(sendedResponse));
                    client.expire(key, 6);
                    resolve(sendedResponse);
                    client.quit();
                    tcpClient.destroy();
                });
            });

            tcpClient.on('error', (err) => {
                console.error("Erreur TCP :", err);
                reject(err);
            });
        });
    } else {
        await client.quit();
        return JSON.parse(response);
    }
}

module.exports = { getInfo };