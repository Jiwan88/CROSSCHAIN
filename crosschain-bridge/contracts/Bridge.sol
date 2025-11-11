// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
    function approve(address spender, uint256 value) external returns (bool);
}

interface ICrossTrustReputation {
    function recordValidation(address node, bytes32 transactionId, bool success) external;
    function recordParticipation(address node, bytes32 transactionId, bool isSource) external;
    function selectValidators(uint256 count) external view returns (address[] memory);
    function getTrustScore(address node) external view returns (uint256);
}

contract Bridge {
    IERC20 public immutable token;
    ICrossTrustReputation public reputationContract;
    address public owner;
    
    // Minimum number of validators required for consensus
    uint256 public minValidators = 3;
    
    // Mapping from lockId to cross-chain transaction details
    struct CrossChainTransaction {
        address from;
        address to;
        uint256 amount;
        bytes32 lockId;
        string targetFabricUser;
        bool isLocked;
        bool isReleased;
        uint256 lockTimestamp;
        uint256 releaseTimestamp;
    }
    
    mapping(bytes32 => CrossChainTransaction) public transactions;
    
    // Mapping from lockId to validator votes
    mapping(bytes32 => mapping(address => bool)) public validatorVotes;
    mapping(bytes32 => uint256) public validatorVoteCount;
    
    // Events
    event Locked(address indexed from, uint256 amount, string targetFabricUser, bytes32 lockId);
    event Released(address indexed to, uint256 amount, bytes32 lockId);
    event ValidatorSelected(address indexed validator, bytes32 indexed lockId, uint256 trustScore);
    event ValidationVote(address indexed validator, bytes32 indexed lockId, bool approved);
    event TransactionValidated(bytes32 indexed lockId, uint256 validatorCount);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }
    
    modifier onlyValidator(bytes32 lockId) {
        // Get validators for this transaction
        address[] memory validators = reputationContract.selectValidators(minValidators);
        bool isValidator = false;
        for (uint256 i = 0; i < validators.length; i++) {
            if (validators[i] == msg.sender) {
                isValidator = true;
                break;
            }
        }
        require(isValidator, "Bridge: not a validator");
        _;
    }

    constructor(address _token, address _reputationContract) {
        token = IERC20(_token);
        reputationContract = ICrossTrustReputation(_reputationContract);
        owner = msg.sender;
    }
    
    /**
     * @dev Set the reputation contract address
     */
    function setReputationContract(address _reputationContract) external onlyOwner {
        reputationContract = ICrossTrustReputation(_reputationContract);
    }
    
    /**
     * @dev Set minimum number of validators
     */
    function setMinValidators(uint256 _minValidators) external onlyOwner {
        require(_minValidators > 0, "Bridge: minValidators must be > 0");
        minValidators = _minValidators;
    }

    /**
     * @dev Lock tokens for cross-chain transfer
     * @param amount Amount of tokens to lock
     * @param targetFabricUser Target user on Fabric chain
     * @return lockId Unique identifier for this lock
     */
    function lock(uint256 amount, string calldata targetFabricUser) external returns (bytes32) {
        require(amount > 0, "amount=0");
        bytes32 lockId = keccak256(abi.encode(msg.sender, amount, targetFabricUser, block.number, block.timestamp));
        
        // Record participation (source)
        reputationContract.recordParticipation(msg.sender, lockId, true);
        
        require(token.transferFrom(msg.sender, address(this), amount), "transferFrom failed");
        
        // Store transaction details
        transactions[lockId] = CrossChainTransaction({
            from: msg.sender,
            to: address(0),
            amount: amount,
            lockId: lockId,
            targetFabricUser: targetFabricUser,
            isLocked: true,
            isReleased: false,
            lockTimestamp: block.timestamp,
            releaseTimestamp: 0
        });
        
        // Select validators and emit events
        address[] memory validators = reputationContract.selectValidators(minValidators);
        for (uint256 i = 0; i < validators.length; i++) {
            uint256 trustScore = reputationContract.getTrustScore(validators[i]);
            emit ValidatorSelected(validators[i], lockId, trustScore);
        }
        
        emit Locked(msg.sender, amount, targetFabricUser, lockId);
        return lockId;
    }
    
    /**
     * @dev Vote on a cross-chain transaction validation
     * @param lockId ID of the locked transaction
     * @param approved Whether the validator approves the transaction
     */
    function voteValidation(bytes32 lockId, bool approved) external onlyValidator(lockId) {
        require(transactions[lockId].isLocked, "Bridge: transaction not locked");
        require(!transactions[lockId].isReleased, "Bridge: transaction already released");
        require(!validatorVotes[lockId][msg.sender], "Bridge: already voted");
        
        validatorVotes[lockId][msg.sender] = true;
        if (approved) {
            validatorVoteCount[lockId]++;
        }
        
        emit ValidationVote(msg.sender, lockId, approved);
        
        // Record validation in reputation contract
        reputationContract.recordValidation(msg.sender, lockId, approved);
        
        // Check if we have enough approvals
        address[] memory validators = reputationContract.selectValidators(minValidators);
        uint256 requiredApprovals = (validators.length * 2) / 3 + 1; // 2/3 + 1 majority
        
        if (validatorVoteCount[lockId] >= requiredApprovals) {
            emit TransactionValidated(lockId, validatorVoteCount[lockId]);
        }
    }
    
    /**
     * @dev Release tokens after validation consensus
     * @param to Address to release tokens to
     * @param amount Amount to release
     * @param lockId ID of the locked transaction
     */
    function release(address to, uint256 amount, bytes32 lockId) external onlyOwner {
        require(transactions[lockId].isLocked, "Bridge: transaction not locked");
        require(!transactions[lockId].isReleased, "Bridge: already released");
        require(transactions[lockId].amount == amount, "Bridge: amount mismatch");
        
        // Check if we have enough validator approvals (2/3 + 1 majority)
        address[] memory validators = reputationContract.selectValidators(minValidators);
        uint256 requiredApprovals = (validators.length * 2) / 3 + 1;
        require(validatorVoteCount[lockId] >= requiredApprovals, "Bridge: insufficient validations");
        
        // Record participation (destination)
        reputationContract.recordParticipation(to, lockId, false);
        
        require(token.transfer(to, amount), "transfer failed");
        
        transactions[lockId].to = to;
        transactions[lockId].isReleased = true;
        transactions[lockId].releaseTimestamp = block.timestamp;
        
        emit Released(to, amount, lockId);
    }
    
    /**
     * @dev Get validator list for a transaction
     * @return validators Array of validator addresses
     */
    function getValidators() external view returns (address[] memory) {
        return reputationContract.selectValidators(minValidators);
    }
    
    /**
     * @dev Get transaction details
     * @param lockId ID of the transaction
     * @return transaction Transaction details struct
     */
    function getTransaction(bytes32 lockId) external view returns (CrossChainTransaction memory) {
        return transactions[lockId];
    }
    
    /**
     * @dev Get validation vote count for a transaction
     * @param lockId ID of the transaction
     * @return count Number of approval votes
     */
    function getValidationVoteCount(bytes32 lockId) external view returns (uint256) {
        return validatorVoteCount[lockId];
    }
}


