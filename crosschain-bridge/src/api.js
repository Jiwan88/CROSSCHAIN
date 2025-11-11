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

    // List Ethereum accounts
    this.app.get('/ethereum/accounts', (req, res) => {
      try {
        const accounts = this.bridge.ethereumClient.getAccounts();
        res.json(accounts);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Create N Ethereum accounts, optionally persist V3 keystore with password
    this.app.post('/ethereum/accounts', async (req, res) => {
      try {
        const { count, keystorePassword } = req.body || {};
        const created = await this.bridge.ethereumClient.createAccounts(count || 1, keystorePassword || null);
        res.json({ success: true, created });
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    });

    // Import hex private keys
    this.app.post('/ethereum/accounts/import', (req, res) => {
      try {
        const { privateKeys } = req.body || {};
        if (!Array.isArray(privateKeys) || privateKeys.length === 0) {
          return res.status(400).json({ error: 'privateKeys must be a non-empty array' });
        }
        const addresses = this.bridge.ethereumClient.importPrivateKeys(privateKeys);
        res.json({ success: true, addresses });
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    });

    // Load keystores from configured KEYSTORE_DIR using password
    this.app.post('/ethereum/accounts/load-keystore', (req, res) => {
      try {
        const { password } = req.body || {};
        if (!password) return res.status(400).json({ error: 'password is required' });
        const addresses = this.bridge.ethereumClient.loadKeystore(password);
        res.json({ success: true, addresses });
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    });

    // Recent events
    this.app.get('/events', (req, res) => {
      res.json(this.bridge.recentEvents || []);
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

    // List Fabric users (local wallet identities)
    this.app.get('/fabric/users', (req, res) => {
      try {
        const users = this.bridge.fabricClient.listUsers();
        res.json(users);
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

    // Create Fabric asset directly (helper)
    this.app.post('/fabric/assets', async (req, res) => {
      try {
        const { assetId, owner, amount } = req.body;
        if (!assetId || !owner) {
          return res.status(400).json({ error: 'assetId and owner are required' });
        }
        const result = await this.bridge.fabricClient.createAsset(assetId, owner, amount || '0');
        res.json({ success: true, result });
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

    // ERC-20 routes
    this.app.get('/erc20/address', (req, res) => {
      res.json({ token: this.bridge.ethereumClient?.deployed?.tokenAddress, bridge: this.bridge.ethereumClient?.deployed?.bridgeAddress });
    });
    this.app.get('/erc20/balance/:address', async (req, res) => {
      try {
        const bal = await this.bridge.ethereumClient.erc20BalanceOf(req.params.address);
        res.json({ address: req.params.address, balance: bal });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });
    this.app.post('/erc20/transfer', async (req, res) => {
      try {
        const { to, amount } = req.body;
        const r = await this.bridge.ethereumClient.erc20Transfer(to, amount);
        res.json({ success: true, transactionHash: r.transactionHash });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });
    this.app.post('/erc20/mint', async (req, res) => {
      try {
        const { to, amount } = req.body;
        const r = await this.bridge.ethereumClient.erc20Mint(to, amount);
        res.json({ success: true, transactionHash: r.transactionHash });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });
    this.app.post('/bridge/lock', async (req, res) => {
      try {
        const { amount, targetFabricUser } = req.body;
        const r = await this.bridge.ethereumClient.bridgeLock(amount, targetFabricUser);
        res.json({ success: true, transactionHash: r.transactionHash });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    // Reputation system routes
    // Get validators
    this.app.get('/reputation/validators', async (req, res) => {
      try {
        const { count } = req.query;
        const validators = await this.bridge.getValidators(count ? parseInt(count) : 3);
        res.json({ validators, count: validators.length });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get trust score for a node
    this.app.get('/reputation/trust-score/:address', async (req, res) => {
      try {
        const { address } = req.params;
        const score = await this.bridge.getTrustScore(address);
        res.json({ address, trustScore: score });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get full reputation data for a node
    this.app.get('/reputation/:address', async (req, res) => {
      try {
        const { address } = req.params;
        const reputation = await this.bridge.getReputation(address);
        res.json({ address, reputation });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get all nodes sorted by trust score
    this.app.get('/reputation/nodes/sorted', async (req, res) => {
      try {
        const result = await this.bridge.getNodesSortedByTrustScore();
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Register a node
    this.app.post('/reputation/nodes/register', async (req, res) => {
      try {
        const { address } = req.body;
        if (!address) {
          return res.status(400).json({ error: 'address is required' });
        }
        const receipt = await this.bridge.registerNode(address);
        res.json({
          success: true,
          message: 'Node registered successfully',
          address,
          transactionHash: receipt.transactionHash
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

      // After init, try to load deployed ERC-20/Bridge addresses
      setTimeout(() => {
        try {
          const ok = this.bridge.ethereumClient.loadDeployedContracts();
          if (ok) console.log('✅ Loaded deployed ERC-20/Bridge addresses');
        } catch (_) { }
      }, 1500);
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
