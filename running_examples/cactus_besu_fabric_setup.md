# Cacti: Ethereum (Besu) ↔ Hyperledger Fabric Setup

## Prerequisites
- Docker + Docker Compose
- ~8GB free RAM, stable internet

## Run
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
```

## Verify
- Follow logs until ready:
```bash
docker logs -f cacti-supply | grep -E "Cactus Cockpit|listening on"
```
- Open `http://127.0.0.1:3200` (Cockpit) in a browser.
- You should see multiple ledgers (Fabric and Besu) and connectors.

## Stop
```bash
docker stop cacti-supply
```

## Notes
- The container is self-contained and spins up Fabric and Besu test ledgers internally via Docker-in-Docker.
- If ports are busy, change the `-p` mappings accordingly.
