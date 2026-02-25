// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IRTFMStaking
 * @dev Interface for the RTFM Staking contract
 */
interface IRTFMStaking {
    /**
     * @notice Stake information structure
     * @param amount The staked amount
     * @param stakedAt The timestamp when staked
     * @param milestoneCheckpoint The last recorded milestone
     * @param attestationComplete Whether attestation is complete
     * @param refunded Whether refund has been claimed
     * @param skillTopic The skill topic
     */
    struct Stake {
        uint256 amount;
        uint256 stakedAt;
        uint256 milestoneCheckpoint;
        bool attestationComplete;
        bool refunded;
        string skillTopic;
    }

    /**
     * @notice Gets user stake information
     * @param _user The user address
     * @param _skill The skill topic
     * @return amount The staked amount
     * @return stakedAt The timestamp when staked
     * @return milestoneCheckpoint The last recorded milestone
     * @return attestationComplete Whether attestation is complete
     * @return refunded Whether refund has been claimed
     * @return skillTopic The skill topic
     */
    function userStakes(address _user, string calldata _skill) external view returns (
        uint256 amount,
        uint256 stakedAt,
        uint256 milestoneCheckpoint,
        bool attestationComplete,
        bool refunded,
        string memory skillTopic
    );
}
