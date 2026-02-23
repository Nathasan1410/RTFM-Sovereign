// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IRTFMErrors {
    error InvalidTopicLength(uint256 provided, uint256 max);
    error InvalidStakeAmount(uint256 provided, uint256 required);
    error InvalidState(uint8 current, uint8 required);
    error SignatureExpired(uint256 deadline, uint256 current);
    error InvalidSignature();
    error ChallengeNotExpired(uint256 deadline);
    error TransferFailed();
    error Unauthorized();
    error TopicAlreadyStaked();
    error InsufficientTreasuryBalance();
}
