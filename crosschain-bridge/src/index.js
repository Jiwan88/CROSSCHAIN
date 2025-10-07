const BridgeAPI = require('./api');
const config = require('./config');

async function main() {
  try {
    console.log('🚀 Starting Cross-Chain Bridge...');
    console.log('📋 Configuration:');
    console.log(`   - Bridge Port: ${config.BRIDGE.PORT}`);
    console.log(`   - Ethereum RPC: ${config.ETHEREUM.RPC_URL}`);
    console.log(`   - Fabric Channel: ${config.FABRIC.CHANNEL_NAME}`);
    console.log(`   - Fabric Chaincode: ${config.FABRIC.CHAINCODE_NAME}`);

    const api = new BridgeAPI();
    await api.start();

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Received SIGINT, shutting down gracefully...');
      await api.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
      await api.stop();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start Cross-Chain Bridge:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

main();
