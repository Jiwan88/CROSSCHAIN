# Cross-Trust Reputation System

## Overview

This document describes the cross-trust reputation system implemented for the cross-chain bridge. The system tracks node reputation based on their participation in validated cross-chain transactions.

## Features

### 1. Trust Score Tracking (0-100 scale)
- Each node (identified by public key/address) has a trust score from 0 to 100
- Trust score increments by 1 each time a node successfully validates a cross-chain transaction
- Trust score is capped at 100 (MAX_TRUST_SCORE)

### 2. Node Registration
- Nodes must be registered in the reputation system before they can participate
- Owner can register single nodes or multiple nodes at once
- Initial trust score for all nodes is 0

### 3. Validator Selection
- Validators are selected based on trust scores (highest scores first)
- When all nodes have the same trust score (tie condition), all registered nodes vote
- This ensures fair participation when nodes are starting out (all at score 0)

### 4. Validation Tracking
- Records when a node validates a cross-chain transaction
- Successful validations increment trust score
- Failed validations are recorded but don't affect trust score

### 5. Participation Tracking
- Tracks node participation as source or destination in cross-chain transactions
- Used to calculate success rate (validations / participations)

### 6. Proof-of-CrossTrust Score
- Combined metric: 70% trust score + 30% success rate
- Provides a comprehensive reputation metric for nodes

## Smart Contracts

### CrossTrustReputation.sol
Main contract for managing node reputation:
- `registerNode(address node)` - Register a new node
- `recordValidation(address node, bytes32 transactionId, bool success)` - Record validation
- `recordParticipation(address node, bytes32 transactionId, bool isSource)` - Record participation
- `selectValidators(uint256 count)` - Select validators based on trust scores
- `getTrustScore(address node)` - Get trust score for a node
- `getReputation(address node)` - Get full reputation data
- `calculateProofOfCrossTrust(address node)` - Calculate proof-of-crosstrust score

### Bridge.sol (Updated)
Enhanced bridge contract with reputation integration:
- Integrates with CrossTrustReputation contract
- Automatically selects validators when locking tokens
- Records participations (source/destination)
- Requires validator consensus (2/3 + 1 majority) before releasing tokens
- Validators vote on transactions using `voteValidation(bytes32 lockId, bool approved)`

## Deployment

### Deploy Contracts
```bash
# Deploy reputation contract first (optional, deploy script handles this)
npm run deploy:reputation

# Deploy ERC20 token and Bridge (includes reputation contract deployment)
npm run deploy:erc20
```

The deployment script will:
1. Deploy CrossTrustReputation contract
2. Deploy ERC20Token contract
3. Deploy Bridge contract (with reputation contract address)
4. Set bridge contract address in reputation contract
5. Save all addresses to `contracts/addresses.json`

## Usage

### Register Nodes
Before nodes can participate, they must be registered:

```javascript
// Via API
POST /reputation/nodes/register
Body: { "address": "0x..." }

// Via JavaScript
await bridge.registerNode("0x...");
```

### Get Validators
```javascript
// Via API
GET /reputation/validators?count=3

// Via JavaScript
const validators = await bridge.getValidators(3);
```

### Get Trust Score
```javascript
// Via API
GET /reputation/trust-score/0x...

// Via JavaScript
const score = await bridge.getTrustScore("0x...");
```

### Get Full Reputation
```javascript
// Via API
GET /reputation/0x...

// Via JavaScript
const reputation = await bridge.getReputation("0x...");
// Returns: { trustScore, validationCount, participationCount, successRate, isRegistered, lastUpdated }
```

### Cross-Chain Transaction Flow

1. **Lock Tokens** (source node):
   - Node calls `bridge.lock(amount, targetFabricUser)`
   - Bridge automatically records participation (as source)
   - Bridge selects validators based on trust scores
   - Validators are notified via events

2. **Validators Vote**:
   - Each validator calls `bridge.voteValidation(lockId, approved)`
   - Bridge records validation in reputation contract
   - If validation succeeds, node's trust score increments

3. **Release Tokens** (after consensus):
   - Owner calls `bridge.release(to, amount, lockId)`
   - Requires 2/3 + 1 majority approval from validators
   - Bridge records participation (destination node)
   - Tokens are transferred to destination

## API Endpoints

- `GET /reputation/validators?count=3` - Get validator list
- `GET /reputation/trust-score/:address` - Get trust score
- `GET /reputation/:address` - Get full reputation data
- `GET /reputation/nodes/sorted` - Get all nodes sorted by trust score
- `POST /reputation/nodes/register` - Register a new node

## Key Design Decisions

1. **Tie-Breaking**: When all nodes have the same score (e.g., all at 0), all nodes vote. This ensures fair participation at startup.

2. **Trust Score Increment**: Each successful validation increments score by 1, capped at 100. This provides clear, measurable reputation growth.

3. **Success Rate**: Tracks validation success rate (validations / participations) to identify reliable validators.

4. **Consensus Requirement**: Bridge requires 2/3 + 1 majority from validators before releasing tokens, ensuring security.

5. **Bridge Authorization**: Reputation contract allows both owner and bridge contract to record validations/participations, enabling automatic tracking.

## Future Enhancements

- Simulate validation success rate and efficacy rate in experiments
- Add slashing mechanism for malicious validators
- Implement time-based decay for trust scores
- Add reputation-based staking requirements

