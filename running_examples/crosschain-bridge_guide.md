# Crosschain Bridge (Fabric ↔ Besu) - Run Guide

This guide explains how to run the crosschain-bridge backend (Node.js/Express) and its minimal React UI, connecting Hyperledger Fabric (test-network) and Hyperledger Besu (dev).

## Prerequisites
- Docker + Docker Compose
- Node.js 18+
- Ports free: 3000 (backend), 5173 (frontend), 8545/8546 (Besu), Fabric defaults (7050/7051/9051/etc.)

## Repo layout (local)
- `besu-dev/` – Besu dev node docker-compose
- `fabric-samples/test-network/` – Fabric test network + chaincode
- `crosschain-bridge/` – Backend API
- `crosschain-bridge-frontend/` – React/Vite UI

## 1) Start Besu
```bash
cd /home/jiwan/CROSSCHAIN/besu-dev
docker compose up -d
# Exposes: 8545 (HTTP), 8546 (WS)
```

## 2) Start Fabric test-network with chaincode "basic"
```bash
cd /home/jiwan/CROSSCHAIN/fabric-samples/test-network
./network.sh down
./network.sh up createChannel -ca -s couchdb
./network.sh deployCC -ccn basic -ccp ../asset-transfer-basic/chaincode-javascript/ -ccl javascript
```

## 3) Configure backend (paths already wired)
Backend uses these defaults (edit `crosschain-bridge/src/config.js` or env vars if needed):
- Ethereum RPC: `http://localhost:8545`
- Fabric MSP paths (Org1 User1 cert/key/TLS) from `fabric-samples/test-network`
- Fabric channel: `mychannel`; chaincode: `basic`

Optional environment overrides:
```bash
export ETHEREUM_RPC_URL=http://localhost:8545
export ETHEREUM_PRIVATE_KEY=0x...               # uses default dev key if omitted
export FABRIC_MSP_ID=Org1MSP
export FABRIC_CHANNEL_NAME=mychannel
export FABRIC_CHAINCODE_NAME=basic
export FABRIC_CERT_PATH=...</n+export FABRIC_KEY_PATH=...</n+export FABRIC_KEY_DIR=...</n+export FABRIC_TLS_CERT_PATH=...
```

## 4) Start backend API
```bash
cd /home/jiwan/CROSSCHAIN/crosschain-bridge
npm install
npm start
# Logs show:
# Cross-Chain Bridge API running on port 3000
# ✅ Connected to Ethereum node / ✅ Connected to Hyperledger Fabric
```

Endpoints:
- `GET /` – info page
- `GET /health` – health + init status
- `GET /status` – summarizes Ethereum/Fabric/Bridge state
- `GET /fabric/assets` – list assets (from basic chaincode)
- `GET /fabric/assets/:id` – read asset
- `POST /fabric/assets/:id/transfer` – transfer asset (JSON: `{ newOwner }`)
- `GET /ethereum/balance/:address` – ETH balance
- `POST /ethereum/transfer` – send ETH (JSON: `{ to, amount }`)
- `POST /assets` – create a cross-chain asset flow (JSON: `{ assetId, owner, amount, targetChain }`)

## 5) Start frontend (Vite)
```bash
cd /home/jiwan/CROSSCHAIN/crosschain-bridge-frontend
npm install (one first time)
VITE_API_BASE=http://localhost:3000 npm run dev
# Open http://localhost:5173
```

UI panels:
- Health / Status – reads backend `/health` and `/status`
- Fabric Assets – lists assets; lets you create cross-chain assets
- Ethereum – quick ETH transfer form

## 6) Quick flows
1) Create cross-chain asset
   - In UI, set `assetId`, `owner`, `amount`, `targetChain`
   - `targetChain=fabric`: creates on Fabric first (and may mirror on ETH depending on flow)
   - `targetChain=ethereum`: sends ETH then writes to Fabric
   - Click Create Cross-Chain → Refresh list

2) Send ETH
   - In Ethereum panel, set `to` and `amount` (ETH), click Send

## Troubleshooting
- Backend shows "Cannot GET /": fixed – root route now returns a small info page. Hit `/health` or `/status` if needed.
- Frontend Health/Status null:
  - Ensure backend is up: `curl http://localhost:3000/health`
  - Hard refresh UI; confirm `VITE_API_BASE` points to backend
- Fabric asset parsing error:
  - Fixed – backend decodes Fabric responses via UTF-8 now.
- Port in use (EADDRINUSE):
  - Stop conflicting app (`docker stop cacti-supply`, kill old node). Then `npm start` again.

## Notes
- This is a demo bridge. Private keys and sample credentials are dev-only.
- For production, use secure key management and proper secrets handling.


