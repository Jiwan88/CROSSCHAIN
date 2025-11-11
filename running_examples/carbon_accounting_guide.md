# Carbon Accounting (Cacti) - Docker Quick Start

This guide shows how to run the Hyperledger Cacti Carbon Accounting example using the official container image.

## Prerequisites
- Docker (and permissions to run it)
- ~2–4GB free RAM
- Open port(s): 8080 (container UI) or whatever ports the image exposes

## Image
- Official package: `ghcr.io/hyperledger/cactus-example-carbon-accounting`
- Reference: https://github.com/orgs/hyperledger/packages/container/package/cactus-example-carbon-accounting

## 1) Pull the image
```bash
docker pull ghcr.io/hyperledger/cactus-example-carbon-accounting:latest
# You can also use a specific tag like v2.0.0-rc.7
# docker pull ghcr.io/hyperledger/cactus-example-carbon-accounting:v2.0.0-rc.7
```
this works:
docker pull ghcr.io/hyperledger/cactus-example-carbon-accounting:v2.0.0-rc.7
docker run --name cactus-carbon --rm -p 8080:8080 -d ghcr.io/hyperledger/cactus-example-carbon-accounting:v2.0.0-rc.7


## 2) Run the container
```bash
docker run \
  --name cactus-carbon \
  --rm \
  -p 8080:8080 \
  -d ghcr.io/hyperledger/cactus-example-carbon-accounting:latest
```

- Then open http://localhost:8080
- If the image uses a different internal port in a future tag, adjust the `-p` mapping accordingly.

## 3) Verify and use
- Wait ~30–60s after start for dependencies to initialize.
- Navigate the UI and follow on-screen flows.

## Stop
```bash
docker stop cactus-carbon
```

## Troubleshooting
- Port busy: change the host port (e.g., `-p 9090:8080`) if 8080 is in use.
- Image not found/permissions: ensure you are logged into GitHub Container Registry if needed: `echo $CR_PAT | docker login ghcr.io -u USERNAME --password-stdin`.
- Slow first start: images/layers may download on first run.

## Notes
- This is a demo; keys/configs are for development only.
- For advanced customization or local source runs, see the Cacti monorepo and the example under `examples/`.
