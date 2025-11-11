# CBDC Bridging (Fabric ↔ Besu) - Run Guide

This mirrors the supply chain run style, but uses the Cacti CBDC example (backend + frontend) to bridge a CBDC ERC-20 on Besu with escrow/escrow-release flows coordinated with Fabric.

## Prerequisites
- Docker + Docker Compose
- Node.js 18+
- ~8GB free RAM
- Ports free: 2000 (frontend), 4000/4100/4200 (backend internal), 8545/8546 (Besu), Fabric defaults (7050/7051/9051/etc.)

## Repo locations
- `cacti/examples/cactus-example-cbdc-bridging/` – Backend app and infra
- `cacti/examples/cactus-example-cbdc-bridging-frontend/` – React frontend

## 1) Start the CBDC backend
From repo root:
```bash
cd /home/jiwan/CROSSCHAIN/cacti
npm run configure
npm run start:example-cbdc-bridging-app | cat
# Wait for: "CbdcBridgingApp running..."
```

Notes:
- This example orchestrates Fabric and Besu test ledgers through Cacti connectors and spins required services. It may take a few minutes on first run.

## 2) Start the frontend
You can use Docker (prebuilt) or run locally.

### Option A: Prebuilt Docker image
```bash
docker run -p 2000:2000 aaugusto11/cactus-example-cbdc-bridging-frontend
# Open http://localhost:2000
```

### Option B: Local live-reload
```bash
cd /home/jiwan/CROSSCHAIN/cacti/examples/cactus-example-cbdc-bridging-frontend
npm install
npm start
# Open http://localhost:2000
```

Do not change the frontend port on your machine; the backend expects requests from port 2000.

### Option C: One-shot cross-chain demo (official Hyperledger image)
If you just want to see a full cross-chain demo spin up in one container (Fabric + Besu + Cacti UI), run the official Supply Chain example image published by Hyperledger. This is the most polished cross-ledger showcase in the registry.

```bash
docker run \
  --name cacti-supply \
  --rm \
  --privileged \
  -p 3000:3000 \
  -p 3100:3100 \
  -p 3200:3200 \
  -p 4000:4000 \
  -p 4100:4100 \
  -p 4200:4200 \
  -d ghcr.io/hyperledger/cactus-example-supply-chain-app:2024-03-08--pr-3059-1
# Open http://127.0.0.1:3200 (Cacti Cockpit)
```

Reference: Hyperledger Packages registry (see containers like `cactus-*`): `https://github.com/orgs/hyperledger/packages`.

## 3) Interact
- Open the frontend and use actions like Mint, Escrow, Bridge Out, Bridge Back, and Transfer.
- The flows mint ERC-20 CBDC on Besu, lock/escrow, and coordinate with Fabric via Cacti’s SATP/BLP extensions.

## Troubleshooting
- Backend not ready: wait until you see "CbdcBridgingApp running..." in logs.
- Frontend can’t reach backend: ensure port 2000 is used and the backend process is still running.
- Port conflicts: stop other demos (e.g., supply chain) and retry.

## Stop
- Stop the frontend container/process (Ctrl+C or `docker stop <container>`)
- Stop the backend with Ctrl+C in its terminal

## Notes
- This is a demo setup; keys and configs are development-only.
- For production, integrate secure key management and hardened deployment.


docker run --name cactus-carbon --rm -p 8080:8080 -d ghcr.io/hyperledger/cactus-example-carbon-accounting:latest
# Then open http://localhost:8080 (adjust port if image uses a different one)