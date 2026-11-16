# PharmaTrust

PharmaTrust is an end-to-end pharmaceutical cold-chain monitoring platform that streams Fernet-encrypted IoT temperature and humidity telemetry over MQTT into a Hyperledger Fabric blockchain ledger. It pairs immutable batch tracking with a machine learning microservice that evaluates supply-chain partner trustworthiness from historical deviation and downtime metrics.

## Key Features

- **Encrypted IoT Telemetry**: Collects temperature and humidity readings from Raspberry Pi Sense HAT sensors (or simulated PC clients), encrypts payloads with symmetric Fernet keys, and queues messages offline until MQTT reconnects.
- **Immutable Blockchain Ledger**: Stores and queries batch sensor records (`CreateMedsData`, `GetAllMedsData`, `AssetExists`) on a Hyperledger Fabric channel (`iotchannel1`) using a Go smart contract (`iot`).
- **Node.js Ingestion & REST Gateway**: Subscribes to the `iot/data` MQTT topic, decrypts incoming payloads, submits Fabric transactions (with worker-pool benchmarking options for latency/throughput CSV logging), and exposes `GET /getAllMedsData` on port `3000`.
- **ML Trustworthiness Advisor**: Trains a scikit-learn Logistic Regression classifier on partner deviation and downtime data and serves real-time `POST /assess-partner` predictions via Flask on port `5000`.

## Tech Stack

- **Blockchain**: Hyperledger Fabric (`test-network`, CA enrollment), Go `1.19`, `fabric-contract-api-go v1.2.1`
- **Backend Gateway**: Node.js, `express ^4.18.2`, `mqtt ^5.0.0`, `fabric-network ^2.2.18`, `fabric-ca-client ^2.2.18`, `fernet ^0.4.0`, `workerpool ^6.4.2`, `csv-writer ^1.6.0`
- **IoT Client**: Python 3, `paho-mqtt`, `cryptography` (Fernet), `sense-hat` (Raspberry Pi), `gmqtt` (load-test scripts)
- **ML Microservice**: Python 3, `flask`, `pandas`, `scikit-learn`, `joblib`
- **Messaging & Infra**: MQTT Broker (port `1883`), Docker & Docker Compose

## Repository Structure

```text
├── backend/          # Express API, MQTT subscriber, Fabric gateway, CA enrollment & benchmark workers
├── chaincode/        # Go smart contract (MedsData) with vendored Fabric dependencies
├── fabric-samples/   # Hyperledger Fabric binaries/configs and test-network scripts
├── iot_client/       # Python Sense HAT & PC simulator MQTT publishers (single & bulk load scripts)
└── ml_model/         # Logistic Regression training script, dataset, and Flask prediction API
```

## Local Setup

### Prerequisites

- Docker & Docker Compose
- Go `1.19+`
- Node.js `16+` & npm
- Python `3.8+` & pip
- Local MQTT broker (e.g., Mosquitto) running on port `1883` with credentials `iot` / `iot123456`

### 1. Start Hyperledger Fabric Network & Deploy Chaincode

From the repository root:

```bash
cd fabric-samples/test-network
./network.sh up createChannel -c iotchannel1 -ca
./network.sh deployCC -c iotchannel1 -ccn iot -ccp ../../chaincode -ccl go
```

### 2. Start the Node.js Backend Gateway

> **Note:** `backend/app.js`, `backend/main.js`, and `backend/worker.js` default `testNetworkRoot` to `~/go/src/github.com/hyperledger2.5/fabric-samples/test-network`, whereas `backend/enrollAdmin.js` resolves `../fabric-samples/test-network`. Update `testNetworkRoot` in `backend/app.js` if running against the bundled `fabric-samples/test-network` directory.

```bash
cd backend
npm install
node enrollAdmin.js
npm start
```

The backend listens on `http://localhost:3000` (`GET /getAllMedsData`) and subscribes to `iot/data`.

### 3. Train & Run the ML Trustworthiness Service

```bash
cd ml_model
pip install flask pandas scikit-learn joblib
python train_model.py
python app.py
```

The Flask API listens on `http://localhost:5000` (`POST /assess-partner` expecting `Deviation_Frequency`, `Deviation_Severity`, `Downtime_Frequency`).

### 4. Run the IoT Telemetry Publisher

Update `broker_ip` in `iot_client/appForPc.py` (or `iot_client/app.py` on Raspberry Pi) to `"localhost"` for local testing:

```bash
cd iot_client
pip install paho-mqtt cryptography
python appForPc.py
```

*(On a Raspberry Pi with a Sense HAT, additionally run `pip install sense-hat` and launch `python app.py`.)*

