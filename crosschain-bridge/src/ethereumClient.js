const { Web3 } = require('web3');
const config = require('./config');
const fs = require('fs');
const path = require('path');

class EthereumClient {
  constructor() {
    this.web3 = new Web3(config.ETHEREUM.RPC_URL);
    this.wsProvider = null;
    this.accounts = [];
    this.bridgeContract = null;
    this.isConnected = false;
    this.erc20 = null;
    this.bridge = null;
    this.deployed = null;
  }

  async connect() {
    try {
      // Check connection
      const isConnected = await this.web3.eth.net.isListening();
      if (!isConnected) {
        throw new Error('Failed to connect to Ethereum node');
      }

      // Get accounts
      this.accounts = await this.web3.eth.getAccounts();
      // Load multiple private keys if provided
      const keysCsv = (config.ETHEREUM.PRIVATE_KEYS || '').trim();
      if (keysCsv) {
        const keys = keysCsv.split(/[,\s]+/).map(k => k.trim()).filter(Boolean);
        for (const key of keys) {
          try {
            const acc = this.web3.eth.accounts.privateKeyToAccount(key);
            this.web3.eth.accounts.wallet.add(acc);
          } catch (e) {
            console.warn('Skipping invalid private key:', e.message);
          }
        }
      }
      if (this.accounts.length === 0) {
        // Fallback to single PRIVATE_KEY if no RPC accounts are unlocked
        if (config.ETHEREUM.PRIVATE_KEY) {
          const account = this.web3.eth.accounts.privateKeyToAccount(config.ETHEREUM.PRIVATE_KEY);
          this.web3.eth.accounts.wallet.add(account);
        }
        // Consolidate addresses from wallet
        const walletAddrs = [];
        for (let i = 0; i < this.web3.eth.accounts.wallet.length; i++) {
          const it = this.web3.eth.accounts.wallet[i];
          if (it && it.address) walletAddrs.push(it.address);
        }
        this.accounts = walletAddrs;
      }
      if (this.accounts.length === 0) {
        throw new Error('No accounts available (RPC personal disabled and no PRIVATE_KEY provided)');
      }

      // Set default account if supported
      if (this.web3.eth.defaultAccount !== undefined) {
        this.web3.eth.defaultAccount = this.accounts[0];
      }

      this.isConnected = true;
      console.log('✅ Connected to Ethereum node');
      console.log(`📊 Network ID: ${await this.web3.eth.net.getId()}`);
      console.log(`💰 Default account: ${this.accounts[0] || 'N/A'}`);
      if (this.accounts[0]) {
        const balWei = await this.web3.eth.getBalance(this.accounts[0]);
        console.log(`💎 Balance: ${this.web3.utils.fromWei(balWei, 'ether')} ETH`);
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to connect to Ethereum:', error.message);
      throw error;
    }
  }

  getAccounts() {
    return this.accounts || [];
  }

  /**
   * Create N new random accounts, optionally persisting each as a V3 keystore JSON file.
   * Returns array of { address, privateKey, keystorePath? }
   */
  async createAccounts(count = 1, keystorePassword = null) {
    const created = [];
    const num = Number(count) || 1;
    if (num < 1 || num > 50) {
      throw new Error('count must be between 1 and 50');
    }

    const outDir = config.ETHEREUM.KEYSTORE_DIR;
    if (keystorePassword) {
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }
    }

    for (let i = 0; i < num; i++) {
      const acct = this.web3.eth.accounts.create();
      // add to in-memory wallet and local list
      this.web3.eth.accounts.wallet.add(acct);
      this.accounts.push(acct.address);

      let keystorePath = null;
      if (keystorePassword) {
        const ks = this.web3.eth.accounts.encrypt(acct.privateKey, keystorePassword);
        const fileName = `UTC--${new Date().toISOString().replace(/[:.]/g, '-')}--${acct.address.replace('0x', '')}.json`;
        keystorePath = path.join(outDir, fileName);
        fs.writeFileSync(keystorePath, JSON.stringify(ks, null, 2));
      }

      created.push({ address: acct.address, privateKey: acct.privateKey, keystorePath });
    }

    // ensure unique accounts list
    this.accounts = Array.from(new Set(this.accounts));
    return created;
  }

  /**
   * Import an array of hex private keys. Returns imported addresses.
   */
  importPrivateKeys(keys = []) {
    if (!Array.isArray(keys)) throw new Error('keys must be an array');
    const addresses = [];
    for (const key of keys) {
      const k = String(key).startsWith('0x') ? String(key) : '0x' + String(key);
      const acct = this.web3.eth.accounts.privateKeyToAccount(k);
      this.web3.eth.accounts.wallet.add(acct);
      this.accounts.push(acct.address);
      addresses.push(acct.address);
    }
    this.accounts = Array.from(new Set(this.accounts));
    return addresses;
  }

  /**
   * Load and decrypt all keystore files in KEYSTORE_DIR using the given password.
   * Returns loaded addresses.
   */
  loadKeystore(password) {
    if (!password) throw new Error('password is required');
    const dir = config.ETHEREUM.KEYSTORE_DIR;
    if (!fs.existsSync(dir)) return [];
    const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.json'));
    const addresses = [];
    for (const f of files) {
      try {
        const json = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
        const acct = this.web3.eth.accounts.decrypt(json, password);
        this.web3.eth.accounts.wallet.add(acct);
        this.accounts.push(acct.address);
        addresses.push(acct.address);
      } catch (e) {
        console.warn(`Failed to decrypt keystore ${f}: ${e.message}`);
      }
    }
    this.accounts = Array.from(new Set(this.accounts));
    return addresses;
  }

  loadDeployedContracts() {
    try {
      const p = path.resolve(__dirname, '../contracts/addresses.json');
      if (!fs.existsSync(p)) return false;
      const json = JSON.parse(fs.readFileSync(p, 'utf8'));
      this.deployed = json;
      const erc20Abi = json.abi.token;
      const bridgeAbi = json.abi.bridge;
      if (json.tokenAddress) {
        this.erc20 = new this.web3.eth.Contract(erc20Abi, json.tokenAddress);
      }
      if (json.bridgeAddress) {
        this.bridge = new this.web3.eth.Contract(bridgeAbi, json.bridgeAddress);
      }
      return true;
    } catch (e) {
      console.error('Error loading deployed contracts:', e);
      return false;
    }
  }

  async getBalance(address) {
    try {
      const balance = await this.web3.eth.getBalance(address);
      return this.web3.utils.fromWei(balance, 'ether');
    } catch (error) {
      console.error('Error getting balance:', error);
      throw error;
    }
  }

  async sendTransaction(to, amount, data = '') {
    try {
      const tx = {
        from: this.accounts[0],
        to: to,
        value: this.web3.utils.toWei(amount, 'ether'),
        gas: config.ETHEREUM.GAS_LIMIT,
        gasPrice: config.ETHEREUM.GAS_PRICE,
        data: data
      };

      const receipt = await this.web3.eth.sendTransaction(tx);
      console.log(`✅ Transaction sent: ${receipt.transactionHash}`);
      return receipt;
    } catch (error) {
      console.error('Error sending transaction:', error);
      throw error;
    }
  }

  // ERC-20 helpers
  async erc20BalanceOf(address) {
    if (!this.erc20) throw new Error('ERC-20 not configured');
    const bal = await this.erc20.methods.balanceOf(address).call();
    return this.web3.utils.fromWei(bal, 'ether');
  }

  async erc20Transfer(to, amountEth) {
    if (!this.erc20) throw new Error('ERC-20 not configured');
    const from = this.accounts[0];
    const amount = this.web3.utils.toWei(String(amountEth), 'ether');
    return await this.erc20.methods.transfer(to, amount).send({ from });
  }

  async erc20Mint(to, amountEth) {
    if (!this.erc20) throw new Error('ERC-20 not configured');
    const from = this.accounts[0];
    const amount = this.web3.utils.toWei(String(amountEth), 'ether');
    return await this.erc20.methods.mint(to, amount).send({ from });
  }

  // Bridge helpers
  async bridgeLock(amountEth, targetFabricUser) {
    if (!this.bridge || !this.erc20) throw new Error('Bridge/Token not configured');
    const from = this.accounts[0];
    const amount = this.web3.utils.toWei(String(amountEth), 'ether');
    // Ensure allowance
    await this.erc20.methods.approve(this.deployed.bridgeAddress, amount).send({ from });
    return await this.bridge.methods.lock(amount, targetFabricUser).send({ from });
  }

  async deployContract(abi, bytecode, constructorArgs = []) {
    try {
      const contract = new this.web3.eth.Contract(abi);
      const deployTx = contract.deploy({
        data: bytecode,
        arguments: constructorArgs
      });

      const gas = await deployTx.estimateGas();
      const deployedContract = await deployTx.send({
        from: this.accounts[0],
        gas: gas,
        gasPrice: config.ETHEREUM.GAS_PRICE
      });

      console.log(`✅ Contract deployed at: ${deployedContract.options.address}`);
      return deployedContract;
    } catch (error) {
      console.error('Error deploying contract:', error);
      throw error;
    }
  }

  async getTransactionReceipt(txHash) {
    try {
      return await this.web3.eth.getTransactionReceipt(txHash);
    } catch (error) {
      console.error('Error getting transaction receipt:', error);
      throw error;
    }
  }

  async waitForConfirmation(txHash, confirmations = config.BRIDGE.CONFIRMATION_BLOCKS) {
    try {
      let receipt = await this.getTransactionReceipt(txHash);
      let currentBlock = await this.web3.eth.getBlockNumber();

      while (receipt && (currentBlock - receipt.blockNumber) < confirmations) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        receipt = await this.getTransactionReceipt(txHash);
        currentBlock = await this.web3.eth.getBlockNumber();
      }

      return receipt;
    } catch (error) {
      console.error('Error waiting for confirmation:', error);
      throw error;
    }
  }

  async subscribeToEvents(contractAddress, abi, eventName, callback) {
    try {
      const contract = new this.web3.eth.Contract(abi, contractAddress);
      const subscription = contract.events[eventName]((error, event) => {
        if (error) {
          console.error('Event subscription error:', error);
        } else {
          callback(event);
        }
      });

      console.log(`📡 Subscribed to ${eventName} events from ${contractAddress}`);
      return subscription;
    } catch (error) {
      console.error('Error subscribing to events:', error);
      throw error;
    }
  }
}

module.exports = EthereumClient;
