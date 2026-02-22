// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title RTFMFaucet
 * @notice Simple testnet faucet for demo users
 * @dev Provides small ETH amounts for testing with rate limiting
 */
contract RTFMFaucet is Ownable, ReentrancyGuard {
    uint256 public constant DRIP_AMOUNT = 0.01 ether;
    uint256 public constant COOLDOWN_PERIOD = 1 hours;
    
    constructor(address initialOwner) Ownable(initialOwner) {}
    
    mapping(address => uint256) public lastDripTime;
    
    event Drip(address indexed recipient, uint256 amount, uint256 timestamp);
    event FaucetFunded(address indexed funder, uint256 amount);

    /// @notice Receive ETH to fund the faucet
    receive() external payable {
        emit FaucetFunded(msg.sender, msg.value);
    }

    /// @notice Distribute ETH to requesters with rate limiting
    function drip() external nonReentrant {
        require(block.timestamp >= lastDripTime[msg.sender] + COOLDOWN_PERIOD, "Cooldown not met");
        require(address(this).balance >= DRIP_AMOUNT, "Faucet empty");

        lastDripTime[msg.sender] = block.timestamp;

        (bool success, ) = payable(msg.sender).call{value: DRIP_AMOUNT}("");
        require(success, "Transfer failed");

        emit Drip(msg.sender, DRIP_AMOUNT, block.timestamp);
    }

    /// @notice Withdraw remaining funds (owner only)
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        payable(owner()).transfer(balance);
    }
}
