const { Web3 } = require('web3');
const config = require('./config');
const fs = require('fs');
const path = require('path');

class ReputationClient {
    constructor() {
        this.web3 = null;
        this.contract = null;
        this.contractAddress = null;
        this.isInitialized = false;
    }

    async connect() {
        try {
            this.web3 = new Web3(config.ETHEREUM.RPC_URL);

            // Load contract addresses
            const addressesPath = path.join(__dirname, '../contracts/addresses.json');
            if (!fs.existsSync(addressesPath)) {
                console.warn('⚠️  Contract addresses file not found. Reputation system will be unavailable.');
                this.isInitialized = false;
                return false;
            }

            const addresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
            this.contractAddress = addresses.reputationAddress;

            if (!this.contractAddress) {
                console.warn('⚠️  Reputation contract address not found. Reputation system will be unavailable.');
                console.warn('   Deploy reputation contract with: npm run deploy:reputation');
                this.isInitialized = false;
                return false;
            }

            if (!addresses.abi || !addresses.abi.reputation) {
                console.warn('⚠️  Reputation contract ABI not found. Reputation system will be unavailable.');
                this.isInitialized = false;
                return false;
            }

            this.contract = new this.web3.eth.Contract(
                addresses.abi.reputation,
                this.contractAddress
            );

            this.isInitialized = true;
            console.log('✅ Connected to CrossTrustReputation contract at:', this.contractAddress);
            return true;
        } catch (error) {
            console.warn('⚠️  Failed to connect to reputation contract:', error.message);
            console.warn('   Reputation system will be unavailable. Bridge will continue without it.');
            this.isInitialized = false;
            return false;
        }
    }

    /**
     * Register a node (public key) in the reputation system
     * @param {string} nodeAddress - Address of the node to register
     * @param {string} fromAddress - Address to send transaction from (must be owner)
     */
    async registerNode(nodeAddress, fromAddress) {
        if (!this.isInitialized) await this.connect();

        try {
            const tx = this.contract.methods.registerNode(nodeAddress);
            const gas = await tx.estimateGas({ from: fromAddress });

            const receipt = await tx.send({
                from: fromAddress,
                gas: gas,
                maxFeePerGas: 1_000_000_000,
                maxPriorityFeePerGas: 0
            });

            console.log(`✅ Node ${nodeAddress} registered. Tx: ${receipt.transactionHash}`);
            return receipt;
        } catch (error) {
            console.error(`❌ Failed to register node ${nodeAddress}:`, error);
            throw error;
        }
    }

    /**
     * Register multiple nodes at once
     * @param {string[]} nodeAddresses - Array of node addresses
     * @param {string} fromAddress - Address to send transaction from (must be owner)
     */
    async registerNodes(nodeAddresses, fromAddress) {
        if (!this.isInitialized) await this.connect();

        try {
            const tx = this.contract.methods.registerNodes(nodeAddresses);
            const gas = await tx.estimateGas({ from: fromAddress });

            const receipt = await tx.send({
                from: fromAddress,
                gas: gas,
                maxFeePerGas: 1_000_000_000,
                maxPriorityFeePerGas: 0
            });

            console.log(`✅ Registered ${nodeAddresses.length} nodes. Tx: ${receipt.transactionHash}`);
            return receipt;
        } catch (error) {
            console.error('❌ Failed to register nodes:', error);
            throw error;
        }
    }

    /**
     * Record a validation by a node
     * @param {string} nodeAddress - Address of the validating node
     * @param {string} transactionId - ID of the cross-chain transaction
     * @param {boolean} success - Whether validation was successful
     * @param {string} fromAddress - Address to send transaction from (must be owner/bridge)
     */
    async recordValidation(nodeAddress, transactionId, success, fromAddress) {
        if (!this.isInitialized) await this.connect();

        try {
            const tx = this.contract.methods.recordValidation(nodeAddress, transactionId, success);
            const gas = await tx.estimateGas({ from: fromAddress });

            const receipt = await tx.send({
                from: fromAddress,
                gas: gas,
                maxFeePerGas: 1_000_000_000,
                maxPriorityFeePerGas: 0
            });

            return receipt;
        } catch (error) {
            console.error(`❌ Failed to record validation for ${nodeAddress}:`, error);
            throw error;
        }
    }

    /**
     * Record participation in a cross-chain transaction
     * @param {string} nodeAddress - Address of the participating node
     * @param {string} transactionId - ID of the cross-chain transaction
     * @param {boolean} isSource - Whether node is source (true) or destination (false)
     * @param {string} fromAddress - Address to send transaction from (must be owner/bridge)
     */
    async recordParticipation(nodeAddress, transactionId, isSource, fromAddress) {
        if (!this.isInitialized) await this.connect();

        try {
            const tx = this.contract.methods.recordParticipation(nodeAddress, transactionId, isSource);
            const gas = await tx.estimateGas({ from: fromAddress });

            const receipt = await tx.send({
                from: fromAddress,
                gas: gas,
                maxFeePerGas: 1_000_000_000,
                maxPriorityFeePerGas: 0
            });

            return receipt;
        } catch (error) {
            console.error(`❌ Failed to record participation for ${nodeAddress}:`, error);
            throw error;
        }
    }

    /**
     * Get trust score of a node
     * @param {string} nodeAddress - Address of the node
     * @returns {Promise<number>} Trust score (0-100)
     */
    async getTrustScore(nodeAddress) {
        if (!this.isInitialized) await this.connect();

        try {
            const score = await this.contract.methods.getTrustScore(nodeAddress).call();
            return Number(score);
        } catch (error) {
            console.error(`❌ Failed to get trust score for ${nodeAddress}:`, error);
            throw error;
        }
    }

    /**
     * Get full reputation data of a node
     * @param {string} nodeAddress - Address of the node
     * @returns {Promise<Object>} Reputation data
     */
    async getReputation(nodeAddress) {
        if (!this.isInitialized) await this.connect();

        try {
            const reputation = await this.contract.methods.getReputation(nodeAddress).call();
            return {
                trustScore: Number(reputation.trustScore),
                validationCount: Number(reputation.validationCount),
                participationCount: Number(reputation.participationCount),
                successRate: Number(reputation.successRate),
                isRegistered: reputation.isRegistered,
                lastUpdated: Number(reputation.lastUpdated)
            };
        } catch (error) {
            console.error(`❌ Failed to get reputation for ${nodeAddress}:`, error);
            throw error;
        }
    }

    /**
     * Select validators based on trust scores
     * @param {number} count - Number of validators to select
     * @returns {Promise<string[]>} Array of validator addresses
     */
    async selectValidators(count = 3) {
        if (!this.isInitialized) await this.connect();

        try {
            const validators = await this.contract.methods.selectValidators(count).call();
            return validators;
        } catch (error) {
            console.error('❌ Failed to select validators:', error);
            throw error;
        }
    }

    /**
     * Get all registered nodes
     * @returns {Promise<string[]>} Array of all registered node addresses
     */
    async getAllRegisteredNodes() {
        if (!this.isInitialized) await this.connect();

        try {
            const nodes = await this.contract.methods.getAllRegisteredNodes().call();
            return nodes;
        } catch (error) {
            console.error('❌ Failed to get registered nodes:', error);
            throw error;
        }
    }

    /**
     * Get nodes sorted by trust score
     * @returns {Promise<{nodes: string[], scores: number[]}>} Sorted nodes and scores
     */
    async getNodesSortedByTrustScore() {
        if (!this.isInitialized) await this.connect();

        try {
            const result = await this.contract.methods.getNodesSortedByTrustScore().call();
            return {
                nodes: result.nodes,
                scores: result.scores.map(s => Number(s))
            };
        } catch (error) {
            console.error('❌ Failed to get sorted nodes:', error);
            throw error;
        }
    }

    /**
     * Calculate proof-of-crosstrust score
     * @param {string} nodeAddress - Address of the node
     * @returns {Promise<number>} Proof-of-crosstrust score (0-100)
     */
    async calculateProofOfCrossTrust(nodeAddress) {
        if (!this.isInitialized) await this.connect();

        try {
            const score = await this.contract.methods.calculateProofOfCrossTrust(nodeAddress).call();
            return Number(score);
        } catch (error) {
            console.error(`❌ Failed to calculate proof-of-crosstrust for ${nodeAddress}:`, error);
            throw error;
        }
    }

    /**
     * Get count of registered nodes
     * @returns {Promise<number>} Number of registered nodes
     */
    async getRegisteredNodeCount() {
        if (!this.isInitialized) await this.connect();

        try {
            const count = await this.contract.methods.getRegisteredNodeCount().call();
            return Number(count);
        } catch (error) {
            console.error('❌ Failed to get node count:', error);
            throw error;
        }
    }
}

module.exports = ReputationClient;

