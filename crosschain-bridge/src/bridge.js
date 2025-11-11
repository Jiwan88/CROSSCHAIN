const EthereumClient = require('./ethereumClient');
const FabricClient = require('./fabricClient');
const ReputationClient = require('./reputationClient');
const config = require('./config');

class CrossChainBridge {
  constructor() {
    this.ethereumClient = new EthereumClient();
    this.fabricClient = new FabricClient();
    this.reputationClient = new ReputationClient();
    this.isInitialized = false;
    this.pendingTransfers = new Map();
  }

  async initialize() {
    try {
      console.log('🚀 Initializing Cross-Chain Bridge...');

      // Connect to both networks
      await this.ethereumClient.connect();
      await this.fabricClient.connect();

      // Connect to reputation contract (optional - won't fail if not deployed)
      const reputationConnected = await this.reputationClient.connect();
      if (!reputationConnected) {
        console.warn('⚠️  Reputation system unavailable. Bridge will continue without it.');
        console.warn('   To enable reputation system, deploy with: npm run deploy:reputation');
      }

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
      // Ethereum summary (resilient if not initialized yet)
      let ethereumConnected = !!this.ethereumClient && this.ethereumClient.isConnected;
      let account = (this.ethereumClient && this.ethereumClient.accounts && this.ethereumClient.accounts[0]) || null;
      let ethereumBalance = null;
      try {
        if (ethereumConnected && account) {
          ethereumBalance = await this.ethereumClient.getBalance(account);
        }
      } catch (e) {
        // leave balance null, but don't fail the whole status
      }

      // Fabric summary
      let fabricAssets = [];
      try {
        fabricAssets = await this.fabricClient.getAllAssets();
      } catch (err) {
        console.warn('Fabric assets fetch failed, continuing with empty list:', err?.message || err);
        fabricAssets = [];
      }

      // Reputation summary
      let reputationStatus = null;
      try {
        if (this.reputationClient && this.reputationClient.isInitialized) {
          const nodeCount = await this.reputationClient.getRegisteredNodeCount();
          const validators = await this.reputationClient.selectValidators(3);
          reputationStatus = {
            connected: true,
            registeredNodes: nodeCount,
            validators: validators.length,
            validatorAddresses: validators
          };
        } else {
          reputationStatus = { connected: false, message: 'Reputation contract not deployed' };
        }
      } catch (err) {
        console.warn('Reputation status fetch failed:', err?.message || err);
        reputationStatus = { connected: false, error: err?.message || 'Unknown error' };
      }

      return {
        ethereum: {
          connected: ethereumConnected,
          balance: ethereumBalance,
          account: account,
        },
        fabric: {
          connected: this.fabricClient.isConnected,
          assets: fabricAssets,
          channel: config.FABRIC.CHANNEL_NAME
        },
        reputation: reputationStatus,
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

  /**
   * Get validators for a cross-chain transaction
   * @returns {Promise<string[]>} Array of validator addresses
   */
  async getValidators(count = 3) {
    try {
      if (!this.reputationClient.isInitialized) {
        const connected = await this.reputationClient.connect();
        if (!connected) {
          throw new Error('Reputation system not available. Deploy reputation contract first.');
        }
      }
      return await this.reputationClient.selectValidators(count);
    } catch (error) {
      console.error('Error getting validators:', error);
      throw error;
    }
  }

  /**
   * Get trust score for a node
   * @param {string} nodeAddress - Address of the node
   * @returns {Promise<number>} Trust score (0-100)
   */
  async getTrustScore(nodeAddress) {
    try {
      if (!this.reputationClient.isInitialized) {
        const connected = await this.reputationClient.connect();
        if (!connected) {
          throw new Error('Reputation system not available. Deploy reputation contract first.');
        }
      }
      return await this.reputationClient.getTrustScore(nodeAddress);
    } catch (error) {
      console.error('Error getting trust score:', error);
      throw error;
    }
  }

  /**
   * Get full reputation data for a node
   * @param {string} nodeAddress - Address of the node
   * @returns {Promise<Object>} Reputation data
   */
  async getReputation(nodeAddress) {
    try {
      if (!this.reputationClient.isInitialized) {
        const connected = await this.reputationClient.connect();
        if (!connected) {
          throw new Error('Reputation system not available. Deploy reputation contract first.');
        }
      }
      return await this.reputationClient.getReputation(nodeAddress);
    } catch (error) {
      console.error('Error getting reputation:', error);
      throw error;
    }
  }

  /**
   * Get all nodes sorted by trust score
   * @returns {Promise<{nodes: string[], scores: number[]}>} Sorted nodes and scores
   */
  async getNodesSortedByTrustScore() {
    try {
      if (!this.reputationClient.isInitialized) {
        const connected = await this.reputationClient.connect();
        if (!connected) {
          throw new Error('Reputation system not available. Deploy reputation contract first.');
        }
      }
      return await this.reputationClient.getNodesSortedByTrustScore();
    } catch (error) {
      console.error('Error getting sorted nodes:', error);
      throw error;
    }
  }

  /**
   * Register a node in the reputation system
   * @param {string} nodeAddress - Address of the node to register
   */
  async registerNode(nodeAddress) {
    try {
      if (!this.reputationClient.isInitialized) {
        const connected = await this.reputationClient.connect();
        if (!connected) {
          throw new Error('Reputation system not available. Deploy reputation contract first.');
        }
      }
      const fromAddress = this.ethereumClient.accounts[0];
      return await this.reputationClient.registerNode(nodeAddress, fromAddress);
    } catch (error) {
      console.error('Error registering node:', error);
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
