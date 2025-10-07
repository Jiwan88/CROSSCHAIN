// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract BridgeContract {
    event TokenLocked(address indexed user, uint256 amount, string fabricAddress);
    event TokenUnlocked(address indexed user, uint256 amount, string fabricAddress);
    
    mapping(address => uint256) public lockedTokens;
    mapping(string => address) public fabricToEthereum;
    mapping(address => string) public ethereumToFabric;
    
    address public owner;
    
    constructor() {
        owner = msg.sender;
    }
    
    function lockTokens(string memory fabricAddress) public payable {
        require(msg.value > 0, "Amount must be greater than 0");
        require(bytes(fabricAddress).length > 0, "Fabric address cannot be empty");
        
        lockedTokens[msg.sender] += msg.value;
        fabricToEthereum[fabricAddress] = msg.sender;
        ethereumToFabric[msg.sender] = fabricAddress;
        
        emit TokenLocked(msg.sender, msg.value, fabricAddress);
    }
    
    function unlockTokens(address user, uint256 amount) public {
        require(msg.sender == owner, "Only owner can unlock tokens");
        require(lockedTokens[user] >= amount, "Insufficient locked tokens");
        
        lockedTokens[user] -= amount;
        
        payable(user).transfer(amount);
        
        emit TokenUnlocked(user, amount, ethereumToFabric[user]);
    }
    
    function getLockedTokens(address user) public view returns (uint256) {
        return lockedTokens[user];
    }
    
    function getFabricAddress(address ethereumAddress) public view returns (string memory) {
        return ethereumToFabric[ethereumAddress];
    }
    
    function getEthereumAddress(string memory fabricAddress) public view returns (address) {
        return fabricToEthereum[fabricAddress];
    }
}
