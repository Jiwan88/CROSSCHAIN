# Cross-Chain Bridge

A bridge application that enables asset transfers between Hyperledger Fabric and Ethereum (Besu).

## Features

- 🔗 Cross-chain asset transfers
- 📡 Real-time event monitoring
- 🌐 REST API for bridge operations
- 🔒 Secure transaction handling
- 📊 Status monitoring

## Prerequisites

- Node.js 16+
- Docker and Docker Compose
- Hyperledger Fabric test network running
- Besu Ethereum node running

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Start the bridge:
```bash
npm start
```

## API Endpoints

- `GET /health` - Health check
- `GET /status` - Bridge status
- `POST /assets` - Create cross-chain asset
- `GET /fabric/assets` - Get Fabric assets
- `POST /fabric/assets/:id/transfer` - Transfer Fabric asset
- `GET /ethereum/balance/:address` - Get Ethereum balance
- `POST /ethereum/transfer` - Send Ethereum transaction

## Usage

The bridge automatically monitors both networks and facilitates cross-chain transfers based on events.
