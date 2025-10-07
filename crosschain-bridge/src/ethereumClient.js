const { Web3 } = require('web3');
const config = require('./config');

class EthereumClient {
  constructor() {
    this.web3 = new Web3(config.ETHEREUM.RPC_URL);
    this.wsProvider = null;
    this.accounts = [];
    this.bridgeContract = null;
    this.isConnected = false;
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
      if (this.accounts.length === 0 && config.ETHEREUM.PRIVATE_KEY) {
        // Derive address from private key explicitly, then add to wallet
        const account = this.web3.eth.accounts.privateKeyToAccount(config.ETHEREUM.PRIVATE_KEY);
        this.web3.eth.accounts.wallet.add(account);
        this.accounts = [account.address];
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
