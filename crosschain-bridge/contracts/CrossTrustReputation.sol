// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CrossTrustReputation
 * @dev Smart contract for tracking cross-chain interoperability reputation scores
 *      Scores are based on frequency of participation in validated cross-chain transactions
 */
contract CrossTrustReputation {
    // Maximum trust score (0-100 scale)
    uint256 public constant MAX_TRUST_SCORE = 100;
    
    // Minimum trust score
    uint256 public constant MIN_TRUST_SCORE = 0;
    
    // Owner of the contract
    address public owner;
    
    // Authorized bridge contract that can record validations/participations
    address public bridgeContract;
    
    // Struct to store node reputation data
    struct NodeReputation {
        uint256 trustScore;           // Trust score (0-100)
        uint256 validationCount;     // Number of successful validations
        uint256 participationCount;   // Total participations (as source or destination)
        uint256 successRate;          // Success rate (0-100, calculated as percentage)
        bool isRegistered;            // Whether node is registered
        uint256 lastUpdated;          // Timestamp of last update
    }
    
    // Mapping from address (public key) to reputation data
    mapping(address => NodeReputation) public nodeReputations;
    
    // List of all registered nodes
    address[] public registeredNodes;
    
    // Mapping to check if node is in registered list
    mapping(address => bool) public isNodeRegistered;
    
    // Events
    event NodeRegistered(address indexed node, uint256 timestamp);
    event TrustScoreUpdated(address indexed node, uint256 oldScore, uint256 newScore, uint256 timestamp);
    event ValidationRecorded(address indexed node, bytes32 indexed transactionId, bool success, uint256 timestamp);
    event ParticipationRecorded(address indexed node, bytes32 indexed transactionId, bool isSource, uint256 timestamp);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "CrossTrustReputation: not owner");
        _;
    }
    
    modifier onlyOwnerOrBridge() {
        require(msg.sender == owner || msg.sender == bridgeContract, "CrossTrustReputation: not authorized");
        _;
    }
    
    modifier onlyRegistered(address node) {
        require(nodeReputations[node].isRegistered, "CrossTrustReputation: node not registered");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Set the bridge contract address (can only be called by owner)
     * @param _bridgeContract Address of the bridge contract
     */
    function setBridgeContract(address _bridgeContract) external onlyOwner {
        bridgeContract = _bridgeContract;
    }
    
    /**
     * @dev Register a new node (public key) in the reputation system
     * @param node Address of the node to register
     */
    function registerNode(address node) external onlyOwner {
        require(!nodeReputations[node].isRegistered, "CrossTrustReputation: node already registered");
        
        nodeReputations[node] = NodeReputation({
            trustScore: 0,
            validationCount: 0,
            participationCount: 0,
            successRate: 0,
            isRegistered: true,
            lastUpdated: block.timestamp
        });
        
        registeredNodes.push(node);
        isNodeRegistered[node] = true;
        
        emit NodeRegistered(node, block.timestamp);
    }
    
    /**
     * @dev Register multiple nodes at once
     * @param nodes Array of node addresses to register
     */
    function registerNodes(address[] calldata nodes) external onlyOwner {
        for (uint256 i = 0; i < nodes.length; i++) {
            if (!nodeReputations[nodes[i]].isRegistered) {
                nodeReputations[nodes[i]] = NodeReputation({
                    trustScore: 0,
                    validationCount: 0,
                    participationCount: 0,
                    successRate: 0,
                    isRegistered: true,
                    lastUpdated: block.timestamp
                });
                
                registeredNodes.push(nodes[i]);
                isNodeRegistered[nodes[i]] = true;
                
                emit NodeRegistered(nodes[i], block.timestamp);
            }
        }
    }
    
    /**
     * @dev Record a validation by a node (increments trust score)
     * @param node Address of the validating node
     * @param transactionId ID of the cross-chain transaction
     * @param success Whether the validation was successful
     */
    function recordValidation(
        address node,
        bytes32 transactionId,
        bool success
    ) external onlyOwnerOrBridge onlyRegistered(node) {
        NodeReputation storage reputation = nodeReputations[node];
        
        if (success) {
            // Increment validation count
            reputation.validationCount++;
            
            // Update trust score (increment by 1, capped at MAX_TRUST_SCORE)
            uint256 oldScore = reputation.trustScore;
            if (reputation.trustScore < MAX_TRUST_SCORE) {
                reputation.trustScore++;
            }
            
            // Calculate success rate (validations / total participations * 100)
            if (reputation.participationCount > 0) {
                reputation.successRate = (reputation.validationCount * 100) / reputation.participationCount;
            } else {
                reputation.successRate = 100; // If no participations yet, success rate is 100%
            }
            
            reputation.lastUpdated = block.timestamp;
            
            emit TrustScoreUpdated(node, oldScore, reputation.trustScore, block.timestamp);
        }
        
        emit ValidationRecorded(node, transactionId, success, block.timestamp);
    }
    
    /**
     * @dev Record participation in a cross-chain transaction (as source or destination)
     * @param node Address of the participating node
     * @param transactionId ID of the cross-chain transaction
     * @param isSource Whether the node is the source (true) or destination (false)
     */
    function recordParticipation(
        address node,
        bytes32 transactionId,
        bool isSource
    ) external onlyOwnerOrBridge onlyRegistered(node) {
        NodeReputation storage reputation = nodeReputations[node];
        
        reputation.participationCount++;
        
        // Recalculate success rate
        if (reputation.participationCount > 0) {
            reputation.successRate = (reputation.validationCount * 100) / reputation.participationCount;
        }
        
        reputation.lastUpdated = block.timestamp;
        
        emit ParticipationRecorded(node, transactionId, isSource, block.timestamp);
    }
    
    /**
     * @dev Get trust score of a node
     * @param node Address of the node
     * @return trustScore Current trust score (0-100)
     */
    function getTrustScore(address node) external view returns (uint256) {
        return nodeReputations[node].trustScore;
    }
    
    /**
     * @dev Get full reputation data of a node
     * @param node Address of the node
     * @return reputation Full reputation struct
     */
    function getReputation(address node) external view returns (NodeReputation memory) {
        return nodeReputations[node];
    }
    
    /**
     * @dev Select validators based on trust scores
     * @param count Number of validators to select
     * @return validators Array of selected validator addresses
     */
    function selectValidators(uint256 count) external view returns (address[] memory) {
        require(count > 0, "CrossTrustReputation: count must be > 0");
        require(registeredNodes.length > 0, "CrossTrustReputation: no registered nodes");
        
        // If count is greater than or equal to registered nodes, return all
        if (count >= registeredNodes.length) {
            return registeredNodes;
        }
        
        // Create a copy of registered nodes with their scores for sorting
        address[] memory sortedNodes = new address[](registeredNodes.length);
        uint256[] memory scores = new uint256[](registeredNodes.length);
        
        for (uint256 i = 0; i < registeredNodes.length; i++) {
            sortedNodes[i] = registeredNodes[i];
            scores[i] = nodeReputations[registeredNodes[i]].trustScore;
        }
        
        // Simple bubble sort by trust score (descending)
        for (uint256 i = 0; i < registeredNodes.length - 1; i++) {
            for (uint256 j = 0; j < registeredNodes.length - i - 1; j++) {
                if (scores[j] < scores[j + 1]) {
                    // Swap scores
                    uint256 tempScore = scores[j];
                    scores[j] = scores[j + 1];
                    scores[j + 1] = tempScore;
                    
                    // Swap addresses
                    address tempAddr = sortedNodes[j];
                    sortedNodes[j] = sortedNodes[j + 1];
                    sortedNodes[j + 1] = tempAddr;
                }
            }
        }
        
        // Check if all nodes have the same score (tie condition)
        bool allTied = true;
        uint256 firstScore = scores[0];
        for (uint256 i = 1; i < registeredNodes.length; i++) {
            if (scores[i] != firstScore) {
                allTied = false;
                break;
            }
        }
        
        // If all nodes are tied, return all registered nodes (everyone votes)
        if (allTied) {
            return registeredNodes;
        }
        
        // Otherwise, return top 'count' validators
        address[] memory validators = new address[](count);
        for (uint256 i = 0; i < count && i < registeredNodes.length; i++) {
            validators[i] = sortedNodes[i];
        }
        
        return validators;
    }
    
    /**
     * @dev Get all registered nodes
     * @return nodes Array of all registered node addresses
     */
    function getAllRegisteredNodes() external view returns (address[] memory) {
        return registeredNodes;
    }
    
    /**
     * @dev Get count of registered nodes
     * @return count Number of registered nodes
     */
    function getRegisteredNodeCount() external view returns (uint256) {
        return registeredNodes.length;
    }
    
    /**
     * @dev Get nodes sorted by trust score (descending)
     * @return nodes Array of node addresses sorted by trust score
     * @return scores Array of corresponding trust scores
     */
    function getNodesSortedByTrustScore() external view returns (address[] memory nodes, uint256[] memory scores) {
        nodes = new address[](registeredNodes.length);
        scores = new uint256[](registeredNodes.length);
        
        for (uint256 i = 0; i < registeredNodes.length; i++) {
            nodes[i] = registeredNodes[i];
            scores[i] = nodeReputations[registeredNodes[i]].trustScore;
        }
        
        // Bubble sort by trust score (descending)
        for (uint256 i = 0; i < registeredNodes.length - 1; i++) {
            for (uint256 j = 0; j < registeredNodes.length - i - 1; j++) {
                if (scores[j] < scores[j + 1]) {
                    // Swap scores
                    uint256 tempScore = scores[j];
                    scores[j] = scores[j + 1];
                    scores[j + 1] = tempScore;
                    
                    // Swap addresses
                    address tempAddr = nodes[j];
                    nodes[j] = nodes[j + 1];
                    nodes[j + 1] = tempAddr;
                }
            }
        }
    }
    
    /**
     * @dev Calculate proof-of-crosstrust score (reputation metric)
     *      Combines trust score and success rate
     * @param node Address of the node
     * @return proofScore Combined proof-of-crosstrust score (0-100)
     */
    function calculateProofOfCrossTrust(address node) external view returns (uint256) {
        NodeReputation memory reputation = nodeReputations[node];
        
        if (!reputation.isRegistered) {
            return 0;
        }
        
        // Weighted combination: 70% trust score, 30% success rate
        uint256 weightedScore = (reputation.trustScore * 70 + reputation.successRate * 30) / 100;
        
        return weightedScore > MAX_TRUST_SCORE ? MAX_TRUST_SCORE : weightedScore;
    }
}

