const EthereumClient = require('./ethereumClient');
const FabricClient = require('./fabricClient');
const config = require('./config');

class CrossChainBridge {
  constructor() {
    this.ethereumClient = new EthereumClient();
    this.fabricClient = new FabricClient();
    this.isInitialized = false;
    this.pendingTransfers = new Map();
  }

  async initialize() {
    try {
      console.log('🚀 Initializing Cross-Chain Bridge...');

      // Connect to both networks
      await this.ethereumClient.connect();
      await this.fabricClient.connect();

      // Set up event listeners
      this.setupEventListeners();

      this.isInitialized = true;
      console.log('✅ Cross-Chain Bridge initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize bridge:', error);
      throw error;
    }
  }

  setupEventListeners() {
    // Listen for Fabric events
    this.fabricClient.subscribeToEvents('AssetTransfer', (event) => {
      console.log('📡 Fabric AssetTransfer event received:', event);
      this.handleFabricEvent(event);
    });

    // Listen for Ethereum events (if bridge contract is deployed)
    if (config.ETHEREUM.BRIDGE_CONTRACT_ADDRESS) {
      this.ethereumClient.subscribeToEvents(
        config.ETHEREUM.BRIDGE_CONTRACT_ADDRESS,
        [], // ABI would go here
        'TokenLocked',
        (event) => {
          console.log('📡 Ethereum TokenLocked event received:', event);
          this.handleEthereumEvent(event);
        }
      );
    }
  }

  async handleFabricEvent(event) {
    try {
      const eventData = JSON.parse(event.payload.toString());
      console.log('🔄 Processing Fabric event:', eventData);

      // Extract transfer information
      const { assetId, from, to, amount } = eventData;

      // Create corresponding Ethereum transaction
      if (to.startsWith('0x')) {
        // This is an Ethereum address, create ETH transfer
        await this.transferToEthereum(to, amount);
      }
    } catch (error) {
      console.error('Error handling Fabric event:', error);
    }
  }

  async handleEthereumEvent(event) {
    try {
      console.log('🔄 Processing Ethereum event:', event);

      // Extract transfer information from event
      const { returnValues } = event;
      const { to, amount } = returnValues;

      // Create corresponding Fabric asset
      await this.transferToFabric(to, amount);
    } catch (error) {
      console.error('Error handling Ethereum event:', error);
    }
  }

  async transferToEthereum(ethereumAddress, amount) {
    try {
      console.log(`🔄 Transferring ${amount} ETH to ${ethereumAddress}`);

      const txReceipt = await this.ethereumClient.sendTransaction(
        ethereumAddress,
        amount
      );

      console.log(`✅ Transfer completed: ${txReceipt.transactionHash}`);
      return txReceipt;
    } catch (error) {
      console.error('Error transferring to Ethereum:', error);
      throw error;
    }
  }

  async transferToFabric(fabricUser, amount) {
    try {
      console.log(`🔄 Creating Fabric asset for ${fabricUser} with amount ${amount}`);

      const assetId = `bridge_${Date.now()}`;
      const result = await this.fabricClient.createAsset(assetId, fabricUser, amount);

      console.log(`✅ Fabric asset created: ${assetId}`);
      return result;
    } catch (error) {
      console.error('Error transferring to Fabric:', error);
      throw error;
    }
  }

  async getBridgeStatus() {
    try {
      const ethereumBalance = await this.ethereumClient.getBalance(
        this.ethereumClient.accounts[0]
      );

      let fabricAssets = [];
      try {
        fabricAssets = await this.fabricClient.getAllAssets();
      } catch (err) {
        console.warn('Fabric assets fetch failed, continuing with empty list:', err?.message || err);
        fabricAssets = [];
      }

      return {
        ethereum: {
          connected: this.ethereumClient.isConnected,
          balance: ethereumBalance,
          account: this.ethereumClient.accounts[0]
        },
        fabric: {
          connected: this.fabricClient.isConnected,
          assets: fabricAssets,
          channel: config.FABRIC.CHANNEL_NAME
        },
        bridge: {
          initialized: this.isInitialized,
          pendingTransfers: this.pendingTransfers.size
        }
      };
    } catch (error) {
      console.error('Error getting bridge status:', error);
      throw error;
    }
  }

  async createCrossChainAsset(assetId, owner, amount, targetChain) {
    try {
      console.log(`🔄 Creating cross-chain asset: ${assetId}`);

      if (targetChain === 'ethereum') {
        // Create Fabric asset first, then transfer to Ethereum
        await this.fabricClient.createAsset(assetId, owner, amount);
        await this.transferToEthereum(owner, amount);
      } else if (targetChain === 'fabric') {
        // Create Ethereum transaction first, then Fabric asset
        await this.transferToEthereum(owner, amount);
        await this.fabricClient.createAsset(assetId, owner, amount);
      }

      console.log(`✅ Cross-chain asset created: ${assetId}`);
      return true;
    } catch (error) {
      console.error('Error creating cross-chain asset:', error);
      throw error;
    }
  }

  async shutdown() {
    try {
      console.log('🛑 Shutting down Cross-Chain Bridge...');

      if (this.fabricClient) {
        await this.fabricClient.disconnect();
      }

      console.log('✅ Bridge shutdown complete');
    } catch (error) {
      console.error('Error during shutdown:', error);
    }
  }
}

module.exports = CrossChainBridge;
