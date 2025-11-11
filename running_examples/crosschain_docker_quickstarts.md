# Cross-Chain Docker Quickstarts (Hyperledger Packages)

These images provide the fastest path to a working cross-ledger demo (Fabric ↔ Besu) via Hyperledger Cacti.

## Recommended: Supply Chain App (all-in-one)
Polished end-to-end demo: spins up Fabric, Besu, Cacti nodes, and UI.

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

## Besu and Fabric all-in-one bases
Use these when you want just the ledger environments without the full app:

- `ghcr.io/hyperledger/cactus-besu-all-in-one`
- `ghcr.io/hyperledger/cactus-fabric-all-in-one`

Find containers in Hyperledger Packages: `https://github.com/orgs/hyperledger/packages`.

Notes:
- Use `--privileged` for containers that spin nested Docker (DinD) for ledger nodes.
- Adjust port mappings if local ports are occupied.


