'use strict';

const fernet = require('fernet');
const fs = require('fs');
const path = require('path');
const { Wallets, Gateway } = require('fabric-network');
const mqtt = require('mqtt');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const osutils = require('os-utils');

const SECRET_KEY = 'ztdoy8Ej58Iq33oPUJFfXS__AHmRG_N2u5IPgwoVJM4=';
const secret = new fernet.Secret(SECRET_KEY);
// ------------------------------------

async function initializeApp() {
    const testNetworkRoot = path.resolve(__dirname, '..', 'fabric-samples', 'test-network');
    const identityLabel = 'user1@org1.example.com';
    const orgName = identityLabel.split('@')[1];
    const orgNameWithoutDomain = orgName.split('.')[0];
    const connectionProfilePath = path.join(testNetworkRoot, 'organizations/peerOrganizations', orgName, `/connection-${orgNameWithoutDomain}.json`);
    const connectionProfile = JSON.parse(fs.readFileSync(connectionProfilePath, 'utf8'));

    const options = {
        username: 'iot',
        password: 'iot123456',
    };

    const client = mqtt.connect('mqtt://localhost', options);
    const connectionOptions = {
        identity: identityLabel,
        wallet: await Wallets.newFileSystemWallet('./wallet'),
        discovery: { enabled: false, asLocalhost: true }
    };

    let contract = null;

    client.on('connect', function () {
        console.log('Connected to MQTT broker.');
        client.subscribe('iot/data', async function (err) {
            if (!err) {
                console.log('Subscribed to iot/data topic');
                await init();
            } else {
                console.error('Error subscribing to iot/data topic', err);
            }
        });
    });

    client.on('error', function(error) {
        console.error('MQTT Error:', error);
    });

    let totalTransactions = 0;
    let transactionsThisSecond = 0;
    let tps = 0;
    let cpuLoad = 0;

    const latencyQueue = [];

    const latencyCsvWriter = createCsvWriter({
        path: 'transaction_latency.csv',
        header: [
            { id: 'timestamp', title: 'TIMESTAMP' },
            { id: 'humidity', title: 'HUMIDITY' },
            { id: 'temperature', title: 'TEMPERATURE' },
            { id: 'startTime', title: 'START_TIME' },
            { id: 'endTime', title: 'END_TIME' },
            { id: 'latencyMs', title: 'LATENCY_MS' },
            { id: 'tps', title: 'TPS' },
            { id: 'totalTransactions', title: 'TOTAL_TRANSACTIONS' },
            { id: 'cpuLoad', title: 'CPU_LOAD' }
        ]
    });

    // --- NEW CODE: REPLACED MESSAGE HANDLER ---
    client.on('message', async function (topic, message) {
        try {
            // Create a new token from the incoming message. This will decrypt it.
            const token = new fernet.Token({
                secret: secret,
                token: message.toString(),
                ttl: 0 // ttl: 0 means the token does not expire
            });

            // Decode the token to get the original JSON string
            const decryptedJsonString = token.decode();

            // Now, parse the DECRYPTED string into a JSON object
            let data = JSON.parse(decryptedJsonString);

            const args = [data.batchNo, data.warehouseNo, data.iotId, data.temperatureSensorId, data.humiditySensorId, data.timestamp, data.temperature.toString(), data.humidity.toString()];
            console.log('Starting the transaction process with arguments:', args);

            const startTime = new Date(); // Record start time

            // Submit the transaction with the arguments
            await invokeTransaction(args);

            const endTime = new Date(); // Record end time
            const latencyMs = endTime.getTime() - startTime.getTime();
            const latencyMsRounded = Math.round(latencyMs / 100) * 100;
            latencyQueue.push(latencyMsRounded);
            if (latencyQueue.length > 5) {
                latencyQueue.shift();
            }
            const movingAverageLatency = Math.round(latencyQueue.reduce((a, b) => a + b) / latencyQueue.length);

            // Prepare and write latency record
            const latencyRecord = {
                timestamp: new Date().toISOString().split('T')[1].split('.')[0],
                humidity: data.humidity,
                temperature: data.temperature,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                latencyMs: movingAverageLatency,
                tps: tps,
                totalTransactions: totalTransactions,
                cpuLoad: cpuLoad
            };
            await latencyCsvWriter.writeRecords([latencyRecord]);

        } catch (error) {
            console.error('Error processing message or submitting transaction:', error);
        }
    });
    // -------------------------------------------

    const throughputCsvWriter = createCsvWriter({
        path: 'transaction_throughput.csv',
        header: [
            { id: 'timestamp', title: 'TIMESTAMP' },
            { id: 'transactionsThisSecond', title: 'TRANSACTIONS_THIS_SECOND' },
            { id: 'totalTransactions', title: 'TOTAL_TRANSACTIONS' },
            { id: 'cpuLoad', title: 'CPU_LOAD' }
        ]
    });

    setInterval(() => {
        tps = transactionsThisSecond;
        osutils.cpuUsage(function(v){
            cpuLoad = Math.round(v * 100);
        });

        const record = {
            timestamp: new Date().toISOString().split('T')[1].split('.')[0],
            transactionsThisSecond: transactionsThisSecond,
            totalTransactions: totalTransactions,
            cpuLoad: cpuLoad
        };

        throughputCsvWriter.writeRecords([record])
            .then(() => {
                console.log('Throughput record written to CSV');
            })
            .catch(error => {
                console.error('Error writing to CSV:', error);
            });

        transactionsThisSecond = 0;
    }, 1000);

    async function init() {
        if (!contract) {
            const gateway = new Gateway();
            await gateway.connect(connectionProfile, connectionOptions);
            const network = await gateway.getNetwork('iotchannel1');
            contract = network.getContract('iot');
        }
    }

    async function invokeTransaction(args) {
        try {
            const response = await contract.submitTransaction('CreateMedsData', ...args);
            console.log(`Transaction submitted successfully: ${response}`);
            totalTransactions++;
            transactionsThisSecond++;
        } catch (error) {
            console.error('Error during the transaction process:', error);
        }
    }
}

initializeApp().catch(error => {
    console.error('Error initializing app:', error);
});
