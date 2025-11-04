const path = require('path');

module.exports = {
  // Ethereum/Besu Configuration
  ETHEREUM: {
    RPC_URL: process.env.ETHEREUM_RPC_URL || 'http://localhost:8545',
    WS_URL: process.env.ETHEREUM_WS_URL || 'ws://localhost:8546',
    PRIVATE_KEY: process.env.ETHEREUM_PRIVATE_KEY || '0x8f2a55949038a9610f50fb23b5883af3b4ecb3c3bb792cbcefbd1542c692be63',
    PRIVATE_KEYS: process.env.ETHEREUM_PRIVATE_KEYS || '',
    KEYSTORE_DIR: process.env.ETHEREUM_KEYSTORE_DIR || path.resolve(__dirname, '../wallet/eth-keystore'),
    BRIDGE_CONTRACT_ADDRESS: process.env.BRIDGE_CONTRACT_ADDRESS || '',
    GAS_LIMIT: 3000000,
    GAS_PRICE: '0x4a817c800' // 20 gwei
  },

  // Hyperledger Fabric Configuration
  FABRIC: {
    MSP_ID: process.env.FABRIC_MSP_ID || 'Org1MSP',
    CHANNEL_NAME: process.env.FABRIC_CHANNEL_NAME || 'mychannel',
    CHAINCODE_NAME: process.env.FABRIC_CHAINCODE_NAME || 'basic',
    PEER_ENDPOINT: process.env.FABRIC_PEER_ENDPOINT || 'localhost:7051',
    CERT_PATH: process.env.FABRIC_CERT_PATH || '/home/jiwan/CROSSCHAIN/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp/signcerts/cert.pem',
    KEY_PATH: process.env.FABRIC_KEY_PATH || '',
    KEY_DIR: process.env.FABRIC_KEY_DIR || '/home/jiwan/CROSSCHAIN/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp/keystore',
    TLS_CERT_PATH: process.env.FABRIC_TLS_CERT_PATH || '/home/jiwan/CROSSCHAIN/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt'
  },

  // Bridge Configuration
  BRIDGE: {
    PORT: process.env.BRIDGE_PORT || 3000,
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    MAX_RETRIES: 3,
    RETRY_DELAY: 5000, // 5 seconds
    CONFIRMATION_BLOCKS: 1
  }
};
