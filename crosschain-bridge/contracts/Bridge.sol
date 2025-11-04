// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
    function approve(address spender, uint256 value) external returns (bool);
}

contract Bridge {
    IERC20 public immutable token;
    address public owner;

    event Locked(address indexed from, uint256 amount, string targetFabricUser, bytes32 lockId);
    event Released(address indexed to, uint256 amount, bytes32 lockId);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor(address _token) {
        token = IERC20(_token);
        owner = msg.sender;
    }

    function lock(uint256 amount, string calldata targetFabricUser) external returns (bytes32) {
        require(amount > 0, "amount=0");
        bytes32 lockId = keccak256(abi.encode(msg.sender, amount, targetFabricUser, block.number));
        require(token.transferFrom(msg.sender, address(this), amount), "transferFrom failed");
        emit Locked(msg.sender, amount, targetFabricUser, lockId);
        return lockId;
    }

    function release(address to, uint256 amount, bytes32 lockId) external onlyOwner {
        require(token.transfer(to, amount), "transfer failed");
        emit Released(to, amount, lockId);
    }
}


