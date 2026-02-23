// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SkillStaking
 * @dev Economic Layer: Handles ETH staking, milestone recording, and refunds.
 *      Only the TEE can record milestones and process refunds.
 */
contract SkillStaking is ReentrancyGuard, Ownable {
    uint256 public constant STAKE_AMOUNT = 0.001 ether;
    uint256 public constant PASS_THRESHOLD = 70;

    struct Stake {
        uint256 amount;          // 0.001 ETH
        uint256 stakedAt;        // block.timestamp
        uint256 milestoneCheckpoint; // Last recorded milestone (0-5)
        bool attestationComplete;    // Final attestation submitted
        bool refunded;               // Refund claimed
        string skillTopic;           // "react-card", etc.
    }

    // Mapping from user => skill topic => Stake
    mapping(address => mapping(string => Stake)) public stakes;

    address public teeAttestor;

    event StakeLocked(address indexed user, string indexed skill, uint256 amount, uint256 timestamp);
    event MilestoneRecorded(address indexed user, string indexed skill, uint256 milestoneId, uint256 timestamp);
    event RefundClaimed(address indexed user, string indexed skill, uint256 amountReturned, uint256 timestamp);
    event TEEAttestorUpdated(address indexed newAttestor);

    modifier onlyTEE() {
        require(msg.sender == teeAttestor, "Only TEE can call this function");
        _;
    }

    constructor(address _teeAttestor) Ownable(msg.sender) {
        teeAttestor = _teeAttestor;
    }

    /**
     * @notice Updates the TEE attestor address.
     * @param _newAttestor The new TEE attestor address.
     */
    function updateTEEAttestor(address _newAttestor) external onlyOwner {
        require(_newAttestor != address(0), "Invalid address");
        teeAttestor = _newAttestor;
        emit TEEAttestorUpdated(_newAttestor);
    }

    /**
     * @notice Stakes ETH for a specific skill challenge.
     * @param skillTopic The skill topic being attempted.
     */
    function stake(string calldata skillTopic) external payable nonReentrant {
        require(msg.value == STAKE_AMOUNT, "Incorrect stake amount");
        require(stakes[msg.sender][skillTopic].amount == 0, "Already staked for this skill");

        stakes[msg.sender][skillTopic] = Stake({
            amount: msg.value,
            stakedAt: block.timestamp,
            milestoneCheckpoint: 0,
            attestationComplete: false,
            refunded: false,
            skillTopic: skillTopic
        });

        emit StakeLocked(msg.sender, skillTopic, msg.value, block.timestamp);
    }

    /**
     * @notice Records a milestone completion for a user.
     * @dev Called by the TEE (Agent 2) at checkpoints.
     * @param user The user address.
     * @param skill The skill topic.
     * @param milestoneId The milestone ID completed.
     */
    function recordMilestone(address user, string calldata skill, uint256 milestoneId) external onlyTEE {
        Stake storage userStake = stakes[user][skill];
        require(userStake.amount > 0, "No active stake found");
        require(!userStake.refunded, "Stake already refunded");
        require(milestoneId > userStake.milestoneCheckpoint, "Milestone already recorded");
        require(milestoneId <= 5, "Invalid milestone ID");

        userStake.milestoneCheckpoint = milestoneId;
        emit MilestoneRecorded(user, skill, milestoneId, block.timestamp);
    }

    /**
     * @notice Claims a refund based on the final score.
     * @dev Called by the TEE (Agent 2) after final attestation.
     * @param user The user address.
     * @param skill The skill topic.
     * @param finalScore The final score (0-100).
     */
    function claimRefund(address user, string calldata skill, uint256 finalScore) external onlyTEE nonReentrant {
        Stake storage userStake = stakes[user][skill];
        require(userStake.amount > 0, "No active stake found");
        require(!userStake.refunded, "Stake already refunded");

        uint256 refundAmount;
        if (finalScore >= PASS_THRESHOLD) {
            // Pass: 80% refund
            refundAmount = (userStake.amount * 80) / 100;
        } else {
            // Fail: 20% refund
            refundAmount = (userStake.amount * 20) / 100;
        }

        userStake.refunded = true;
        userStake.attestationComplete = true;

        // Transfer refund to user
        (bool success, ) = payable(user).call{value: refundAmount}("");
        require(success, "Transfer failed");

        emit RefundClaimed(user, skill, refundAmount, block.timestamp);
    }

    /**
     * @notice Withdraws the accumulated treasury (non-refunded stakes).
     * @dev Only owner can call this.
     */
    function withdrawTreasury() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Transfer failed");
    }
}
