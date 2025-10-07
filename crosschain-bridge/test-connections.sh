#!/bin/bash

echo "🚀 Testing Cross-Chain Bridge Connections..."
echo ""

# Test Ethereum/Besu connection
echo "🔍 Testing Ethereum/Besu connection..."
ETH_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://localhost:8545 2>/dev/null)

if [[ $ETH_RESPONSE == *"result"* ]]; then
    echo "✅ Ethereum/Besu: Connected"
    BLOCK_NUMBER=$(echo $ETH_RESPONSE | grep -o '"result":"[^"]*"' | cut -d'"' -f4)
    echo "📊 Current block: $BLOCK_NUMBER"
else
    echo "❌ Ethereum/Besu: Failed to connect"
fi

echo ""

# Test Fabric connection
echo "🔍 Testing Fabric connection..."
cd /home/jiwan/CROSSCHAIN/fabric-samples/test-network

# Check if chaincode is installed and committed
FABRIC_STATUS=$(./network.sh cc list 2>/dev/null | grep -c "basic")

if [[ $FABRIC_STATUS -gt 0 ]]; then
    echo "✅ Hyperledger Fabric: Connected"
    echo "📋 Chaincode 'basic' is deployed and running"
else
    echo "❌ Hyperledger Fabric: Chaincode not found"
fi

echo ""

# Summary
echo "📊 Connection Summary:"
if [[ $ETH_RESPONSE == *"result"* ]] && [[ $FABRIC_STATUS -gt 0 ]]; then
    echo "🎉 Both networks are connected! Cross-chain bridge is ready."
    echo ""
    echo "📋 Next steps:"
    echo "   1. Install Node.js: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs"
    echo "   2. Install bridge dependencies: cd /home/jiwan/CROSSCHAIN/crosschain-bridge && npm install"
    echo "   3. Start the bridge: npm start"
    echo "   4. Test the API: curl http://localhost:3000/health"
else
    echo "⚠️  Some networks are not connected. Please check:"
    if [[ $ETH_RESPONSE != *"result"* ]]; then
        echo "   - Ensure Besu is running: cd /home/jiwan/CROSSCHAIN/besu-dev && docker-compose up -d"
    fi
    if [[ $FABRIC_STATUS -eq 0 ]]; then
        echo "   - Ensure Fabric network is running: cd /home/jiwan/CROSSCHAIN/fabric-samples/test-network && ./network.sh up createChannel -ca"
    fi
fi

