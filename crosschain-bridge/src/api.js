const express = require('express');
const cors = require('cors');
const CrossChainBridge = require('./bridge');
const config = require('./config');

class BridgeAPI {
  constructor() {
    this.app = express();
    this.bridge = new CrossChainBridge();
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  setupRoutes() {
    // Root info
    this.app.get('/', (req, res) => {
      res.status(200).send(
        '<html><body style="font-family: sans-serif;">' +
          '<h3>Cross-Chain Bridge API</h3>' +
          '<ul>' +
            '<li><a href="/health">/health</a></li>' +
            '<li><a href="/status">/status</a></li>' +
          '</ul>' +
          '<p>Frontend (if running): http://localhost:5173</p>' +
        '</body></html>'
      );
    });

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        bridge: this.bridge.isInitialized
      });
    });

    // Get bridge status
    this.app.get('/status', async (req, res) => {
      try {
        const status = await this.bridge.getBridgeStatus();
        res.json(status);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Create cross-chain asset
    this.app.post('/assets', async (req, res) => {
      try {
        const { assetId, owner, amount, targetChain } = req.body;

        if (!assetId || !owner || !amount || !targetChain) {
          return res.status(400).json({
            error: 'Missing required fields: assetId, owner, amount, targetChain'
          });
        }

        await this.bridge.createCrossChainAsset(assetId, owner, amount, targetChain);
        res.json({
          success: true,
          message: 'Cross-chain asset created successfully',
          assetId,
          owner,
          amount,
          targetChain
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get Fabric assets
    this.app.get('/fabric/assets', async (req, res) => {
      try {
        const assets = await this.bridge.fabricClient.getAllAssets();
        res.json(assets);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get specific Fabric asset
    this.app.get('/fabric/assets/:assetId', async (req, res) => {
      try {
        const { assetId } = req.params;
        const asset = await this.bridge.fabricClient.getAsset(assetId);
        res.json(asset);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Transfer Fabric asset
    this.app.post('/fabric/assets/:assetId/transfer', async (req, res) => {
      try {
        const { assetId } = req.params;
        const { newOwner } = req.body;

        if (!newOwner) {
          return res.status(400).json({ error: 'Missing newOwner field' });
        }

        await this.bridge.fabricClient.transferAsset(assetId, newOwner);
        res.json({
          success: true,
          message: 'Asset transferred successfully',
          assetId,
          newOwner
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get Ethereum balance
    this.app.get('/ethereum/balance/:address', async (req, res) => {
      try {
        const { address } = req.params;
        const balance = await this.bridge.ethereumClient.getBalance(address);
        res.json({ address, balance });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Send Ethereum transaction
    this.app.post('/ethereum/transfer', async (req, res) => {
      try {
        const { to, amount } = req.body;

        if (!to || !amount) {
          return res.status(400).json({ error: 'Missing required fields: to, amount' });
        }

        const receipt = await this.bridge.ethereumClient.sendTransaction(to, amount);
        res.json({
          success: true,
          message: 'Transaction sent successfully',
          transactionHash: receipt.transactionHash,
          to,
          amount
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Error handling middleware
    this.app.use((error, req, res, next) => {
      console.error('API Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    });
  }

  async start() {
    try {
      // Start server first so health endpoint is available
      this.server = this.app.listen(config.BRIDGE.PORT, () => {
        console.log(`🌉 Cross-Chain Bridge API running on port ${config.BRIDGE.PORT}`);
        console.log(`📡 Health check: http://localhost:${config.BRIDGE.PORT}/health`);
        console.log(`📊 Status: http://localhost:${config.BRIDGE.PORT}/status`);
      });

      // Initialize bridge in background
      this.bridge.initialize().catch((error) => {
        console.error('Bridge initialization failed (server still running):', error.message || error);
      });
    } catch (error) {
      console.error('Failed to start API server:', error);
      process.exit(1);
    }
  }

  async stop() {
    try {
      await this.bridge.shutdown();
      if (this.server) {
        this.server.close();
      }
      console.log('🛑 API server stopped');
    } catch (error) {
      console.error('Error stopping API server:', error);
    }
  }
}

module.exports = BridgeAPI;
