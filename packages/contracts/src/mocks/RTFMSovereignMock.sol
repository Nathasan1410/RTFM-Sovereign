// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "../RTFMVerifiableRegistry.sol";

/**
 * @title RTFMSovereignMock
 * @notice Mock contract for frontend development and testing
 * @dev Bypasses signature verification and allows direct state manipulation
 */
contract RTFMSovereignMock is RTFMVerifiableRegistry {
    
    /// @notice Helper to simulate TEE enrollment without 2-step process
    function forceEnrollTEE(address tee) external {
        TEE_PUBLIC_KEY = tee;
        emit TEEActivated(tee);
    }

    /// @notice Helper to simulate attestation without signature
    function mockAttestation(
        address user,
        string calldata topic,
        uint256 score
    ) external {
        bytes32 topicHash = keccak256(bytes(topic));
        StakeInfo storage stake = stakes[user][topicHash];

        // Auto-transition state if needed
        if (stake.state == State.Staked) {
            stake.state = State.Attesting;
        }

        stake.state = State.Verified;

        Attestation storage att = attestations[user][topicHash];
        att.topicHash = topicHash;
        att.score = uint96(score);
        att.timestamp = uint40(block.timestamp);
        att.isValid = score >= SCORE_THRESHOLD;
        att.attestor = msg.sender;

        emit AttestationSubmitted(user, topicHash, uint96(score), bytes32(0));
        
        // Handle mock payout if needed? 
        // Real contract logic handles payout in submitAttestation. 
        // For mock, we might just update state or replicate logic.
        // Replicating payout logic:
        uint256 payout = 0;
        uint256 fee = 0;
        
        if (stake.amount > 0) {
            fee = (stake.amount * TREASURY_FEE_BPS) / BASIS_POINTS;
            payout = stake.amount - fee;
            
            treasuryBalance += fee;
            stake.state = State.Released;
            
            payable(user).transfer(payout);
            emit StakeReleased(user, topicHash, payout, fee);
        }
    }
}
