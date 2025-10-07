const { connect, Identity, Signer, signers } = require('@hyperledger/fabric-gateway');
const { TextDecoder } = require('util');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const config = require('./config');

class FabricClient {
  constructor() {
    this.client = null;
    this.network = null;
    this.contract = null;
    this.isConnected = false;
    this.utf8Decoder = new TextDecoder();
  }

  async connect() {
    try {
      const certPem = fs.readFileSync(config.FABRIC.CERT_PATH, 'utf8');
      let keyPem;
      if (config.FABRIC.KEY_PATH && fs.existsSync(config.FABRIC.KEY_PATH)) {
        keyPem = fs.readFileSync(config.FABRIC.KEY_PATH, 'utf8');
      } else {
        const keyDir = config.FABRIC.KEY_DIR;
        const files = fs.readdirSync(keyDir).filter(f => f.endsWith('.pem') || f.length > 0);
        if (files.length === 0) {
          throw new Error(`No private key found in ${keyDir}`);
        }
        keyPem = fs.readFileSync(path.join(keyDir, files[0]), 'utf8');
      }
      const tlsCertPem = fs.readFileSync(config.FABRIC.TLS_CERT_PATH, 'utf8');

      const identity = {
        mspId: config.FABRIC.MSP_ID,
        credentials: Buffer.from(certPem),
      };

      const privateKey = crypto.createPrivateKey(keyPem);
      const signer = signers.newPrivateKeySigner(privateKey);

      // Low-level gRPC client setup using Fabric Gateway Node SDK transport
      const grpc = require('@grpc/grpc-js');
      // Note: We do not need to load protos when using connect(); just create TLS credentials
      const tlsRootCert = Buffer.from(tlsCertPem);
      const sslCreds = grpc.credentials.createSsl(tlsRootCert);

      const client = new grpc.Client(config.FABRIC.PEER_ENDPOINT, sslCreds, {
        'grpc.ssl_target_name_override': 'peer0.org1.example.com',
        'grpc.default_authority': 'peer0.org1.example.com'
      });

      this.client = connect({
        client,
        identity,
        signer,
      });

      this.network = this.client.getNetwork(config.FABRIC.CHANNEL_NAME);
      this.contract = this.network.getContract(config.FABRIC.CHAINCODE_NAME);

      this.isConnected = true;
      console.log('✅ Connected to Hyperledger Fabric');
      console.log(`📊 Channel: ${config.FABRIC.CHANNEL_NAME}`);
      console.log(`📋 Chaincode: ${config.FABRIC.CHAINCODE_NAME}`);

      return true;
    } catch (error) {
      console.error('❌ Failed to connect to Fabric:', error.message);
      throw error;
    }
  }

  async submitTransaction(functionName, ...args) {
    try {
      if (!this.contract) {
        throw new Error('Not connected to Fabric network');
      }

      const resultBytes = await this.contract.submitTransaction(functionName, ...args);
      const result = this.utf8Decoder.decode(resultBytes);
      console.log(`✅ Transaction submitted: ${functionName}`);
      console.log(`📄 Result: ${result}`);
      return result;
    } catch (error) {
      console.error('Error submitting transaction:', error);
      throw error;
    }
  }

  async evaluateTransaction(functionName, ...args) {
    try {
      if (!this.contract) {
        throw new Error('Not connected to Fabric network');
      }

      const resultBytes = await this.contract.evaluateTransaction(functionName, ...args);
      const result = this.utf8Decoder.decode(resultBytes);
      console.log(`✅ Transaction evaluated: ${functionName}`);
      console.log(`📄 Result: ${result}`);
      return result;
    } catch (error) {
      console.error('Error evaluating transaction:', error);
      throw error;
    }
  }

  async createAsset(assetId, owner, amount) {
    try {
      // Map to asset-transfer-basic chaincode signature:
      // CreateAsset(id, color, size, owner, appraisedValue)
      const color = 'blue';
      const size = '10';
      const appraisedValue = String(Number(amount) || 0);
      const result = await this.submitTransaction(
        'CreateAsset',
        assetId,
        color,
        size,
        owner,
        appraisedValue
      );
      return result;
    } catch (error) {
      console.error('Error creating asset:', error);
      throw error;
    }
  }

  async getAsset(assetId) {
    try {
      const result = await this.evaluateTransaction('ReadAsset', assetId);
      return JSON.parse(result);
    } catch (error) {
      console.error('Error getting asset:', error);
      throw error;
    }
  }

  async transferAsset(assetId, newOwner) {
    try {
      const result = await this.submitTransaction('TransferAsset', assetId, newOwner);
      return result;
    } catch (error) {
      console.error('Error transferring asset:', error);
      throw error;
    }
  }

  async getAllAssets() {
    try {
      const result = await this.evaluateTransaction('GetAllAssets');
      return JSON.parse(result || '[]');
    } catch (error) {
      console.error('Error getting all assets:', error);
      throw error;
    }
  }

  async subscribeToEvents(eventName, callback) {
    try {
      if (!this.network) {
        throw new Error('Not connected to Fabric network');
      }

      const events = await this.network.getChaincodeEvents(config.FABRIC.CHAINCODE_NAME);
      (async () => {
        for await (const event of events) {
          if (event.eventName === eventName) {
            callback(event);
          }
        }
      })();
      console.log(`📡 Subscribed to ${eventName} events`);
    } catch (error) {
      console.error('Error subscribing to events:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.client) {
        this.client.close();
        this.isConnected = false;
        console.log('✅ Disconnected from Fabric');
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  }
}

module.exports = FabricClient;
