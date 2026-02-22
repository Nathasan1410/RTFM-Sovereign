// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "./IRTFMErrors.sol";

interface IRTFMSovereign is IRTFMErrors {
    enum State {
        Idle,
        Staked,
        Attesting,
        Verified,
        Released
    }

    struct StakeInfo {
        uint128 amount;
        uint40 stakedAt;
        uint40 challengeDeadline;
        bytes20 challengeHash;
        State state;
        uint8 attemptNumber;
    }

    struct Attestation {
        bytes32 topicHash;
        uint96 score;
        uint40 timestamp;
        uint16 attemptCount;
        bool isValid;
        bytes signature;
        address attestor;
    }

    event StakeDeposited(address indexed user, bytes32 indexed topicHash, uint128 amount, uint256 stakeId, uint40 deadline);
    event ChallengeInitiated(address indexed user, bytes32 indexed topicHash, bytes32 challengeCID, uint40 expiry);
    event AttestationSubmitted(address indexed user, bytes32 indexed topicHash, uint96 score, bytes32 indexed attestationHash);
    event StakeReleased(address indexed user, bytes32 indexed topicHash, uint256 userPayout, uint256 teeFee);
    event TEEActivated(address indexed teeAddress);
    event TreasuryWithdrawn(address indexed tee, uint256 amount, address to);

    function stakeForChallenge(string calldata topic) external payable;
    function enrollTEE(address teePublicKey, bytes calldata proofOfPossession) external;
    function activateTEE() external;
    function initiateChallenge(address user, string calldata topic, bytes32 challengeCID) external;
    function submitAttestation(address user, string calldata topic, uint256 score, uint256 nonce, uint256 deadline, bytes calldata signature) external;
    function emergencyRefund(string calldata topic) external;
    function withdrawTreasury(uint256 amount, address to) external;

    function verifySkill(address user, string calldata topic) external view returns (bool, uint256, uint256);
    function getStakeDetails(address user, string calldata topic) external view returns (StakeInfo memory);
    function getDomainSeparator() external view returns (bytes32);
    function getTreasuryBalance() external view returns (uint256);
}
