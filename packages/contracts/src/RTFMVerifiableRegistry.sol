// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IRTFMSovereign.sol";

/**
 * @title RTFMVerifiableRegistry
 * @notice Sovereign registry for verifiable skill attestations via TEE agents
 * @dev Implements EIP-712 for secure attestation verification
 */
contract RTFMVerifiableRegistry is IRTFMSovereign, EIP712, ReentrancyGuard {
    using ECDSA for bytes32;

    // --- Constants ---
    uint256 public constant STAKE_AMOUNT = 0.001 ether;
    uint256 public constant TIMEOUT_DURATION = 7 days;
    uint256 public constant SCORE_THRESHOLD = 70;
    uint256 public constant TREASURY_FEE_BPS = 2000; // 20%
    uint256 public constant BASIS_POINTS = 10000;
    bytes32 private constant ATTESTATION_TYPEHASH = keccak256("Attestation(address user,string topic,uint256 score,uint256 nonce,uint256 deadline)");

    // --- State Variables ---
    address public TEE_PUBLIC_KEY;
    address public pendingTEE;
    address public deployer;
    uint256 public treasuryBalance;
    
    // User -> TopicHash -> StakeInfo
    mapping(address => mapping(bytes32 => StakeInfo)) public stakes;
    // User -> TopicHash -> Attestation
    mapping(address => mapping(bytes32 => Attestation)) public attestations;
    // User -> Nonce usage
    mapping(address => uint256) public userNonces;

    // --- Modifiers ---
    modifier onlyDeployer() {
        if (msg.sender != deployer) revert Unauthorized();
        _;
    }

    modifier onlyPendingTEE() {
        if (msg.sender != pendingTEE) revert Unauthorized();
        _;
    }

    modifier onlyTEE() {
        if (msg.sender != TEE_PUBLIC_KEY) revert Unauthorized();
        _;
    }

    constructor() EIP712("RTFMVerifiableRegistry", "1") {
        deployer = msg.sender;
    }

    // --- TEE Enrollment ---

    /// @notice Step 1: Deployer proposes a TEE address
    /// @param teePublicKey The address of the TEE agent
    /// @param proofOfPossession Signature proving TEE controls this key (not verified on-chain in this MVP, but required for protocol)
    function enrollTEE(address teePublicKey, bytes calldata proofOfPossession) external onlyDeployer {
        // In a real production system, we might verify the PoP here.
        // For this MVP, we trust the deployer to verify off-chain before calling.
        require(proofOfPossession.length > 0, "PoP required"); 
        pendingTEE = teePublicKey;
    }

    /// @notice Step 2: TEE accepts the role and burns deployer rights
    function activateTEE() external onlyPendingTEE {
        TEE_PUBLIC_KEY = pendingTEE;
        pendingTEE = address(0);
        deployer = address(0); // Renounce ownership
        emit TEEActivated(TEE_PUBLIC_KEY);
    }

    // --- Core Functions ---

    /// @notice Stakes ETH to initiate a challenge
    /// @param topic The topic to challenge (max 64 bytes)
    function stakeForChallenge(string calldata topic) external payable nonReentrant {
        if (bytes(topic).length == 0 || bytes(topic).length > 64) revert InvalidTopicLength(bytes(topic).length, 64);
        if (msg.value != STAKE_AMOUNT) revert InvalidStakeAmount(msg.value, STAKE_AMOUNT);

        bytes32 topicHash = keccak256(bytes(topic));
        StakeInfo storage stake = stakes[msg.sender][topicHash];

        if (stake.state == State.Staked || stake.state == State.Attesting) revert TopicAlreadyStaked();
        if (stake.state == State.Verified) revert TopicAlreadyStaked();

        stake.amount = uint128(msg.value);
        stake.stakedAt = uint40(block.timestamp);
        stake.challengeDeadline = uint40(block.timestamp + TIMEOUT_DURATION);
        stake.state = State.Staked;
        stake.attemptNumber++;

        // Reset attestation if re-taking (from Released state)
        delete attestations[msg.sender][topicHash];

        emit StakeDeposited(msg.sender, topicHash, uint128(msg.value), uint256(topicHash), stake.challengeDeadline);
    }

    /// @notice TEE acknowledges the challenge and moves state to Attesting
    function initiateChallenge(address user, string calldata topic, bytes32 challengeCID) external onlyTEE {
        bytes32 topicHash = keccak256(bytes(topic));
        StakeInfo storage stake = stakes[user][topicHash];

        if (stake.state != State.Staked) revert InvalidState(uint8(stake.state), uint8(State.Staked));
        
        stake.state = State.Attesting;
        // Deadline is already set during stake
        
        emit ChallengeInitiated(user, topicHash, challengeCID, stake.challengeDeadline);
    }

    /// @notice Submits the attestation result and handles payout
    function submitAttestation(
        address user, 
        string calldata topic, 
        uint256 score, 
        uint256 nonce, 
        uint256 deadline, 
        bytes calldata signature
    ) external onlyTEE nonReentrant {
        if (block.timestamp > deadline) revert SignatureExpired(deadline, block.timestamp);
        if (nonce != userNonces[user]) revert InvalidSignature(); // Replay protection

        bytes32 topicHash = keccak256(bytes(topic));
        StakeInfo storage stake = stakes[user][topicHash];

        if (stake.state != State.Attesting) revert InvalidState(uint8(stake.state), uint8(State.Attesting));

        // Verify Signature
        bytes32 structHash = keccak256(abi.encode(
            ATTESTATION_TYPEHASH,
            user,
            keccak256(bytes(topic)),
            score,
            nonce,
            deadline
        ));
        
        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(hash, signature);
        
        if (signer != TEE_PUBLIC_KEY) revert InvalidSignature();

        // Update State
        userNonces[user]++;
        stake.state = State.Verified;
        
        Attestation storage att = attestations[user][topicHash];
        att.topicHash = topicHash;
        att.score = uint96(score);
        att.timestamp = uint40(block.timestamp);
        att.isValid = score >= SCORE_THRESHOLD;
        att.signature = signature;
        att.attestor = TEE_PUBLIC_KEY;

        emit AttestationSubmitted(user, topicHash, uint96(score), hash);

        // Economic Distribution
        uint256 payout = 0;
        uint256 fee = 0;

        if (score >= SCORE_THRESHOLD) {
            // Pass: Return 80%, Keep 20%
            fee = (stake.amount * TREASURY_FEE_BPS) / BASIS_POINTS;
            payout = stake.amount - fee;
        } else {
            // Fail: Return 80%, Keep 20% penalty
            fee = (stake.amount * TREASURY_FEE_BPS) / BASIS_POINTS;
            payout = stake.amount - fee;
        }

        // Move to Released state after payout logic
        stake.state = State.Released;

        // Transfer Payout to User
        (bool success, ) = payable(user).call{value: payout}("");
        if (!success) revert TransferFailed();

        // Fee stays in contract as Treasury
        treasuryBalance += fee;
        emit StakeReleased(user, topicHash, payout, fee);
    }

    /// @notice Allows user to refund if TEE is unresponsive after timeout
    function emergencyRefund(string calldata topic) external nonReentrant {
        bytes32 topicHash = keccak256(bytes(topic));
        StakeInfo storage stake = stakes[msg.sender][topicHash];

        if (stake.state != State.Staked && stake.state != State.Attesting) {
             revert InvalidState(uint8(stake.state), uint8(State.Staked)); // Simplified error, implies not in active state
        }

        if (block.timestamp <= stake.challengeDeadline) revert ChallengeNotExpired(stake.challengeDeadline);

        // Penalty 5%
        uint256 penalty = (stake.amount * 500) / BASIS_POINTS; // 5%
        uint256 refund = stake.amount - penalty;

        stake.state = State.Released;
        treasuryBalance += penalty;

        (bool success, ) = payable(msg.sender).call{value: refund}("");
        if (!success) revert TransferFailed();
        
        emit StakeReleased(msg.sender, topicHash, refund, penalty);
    }

    /// @notice Withdraws accumulated treasury fees
    function withdrawTreasury(uint256 amount, address to) external onlyTEE nonReentrant {
        if (amount > treasuryBalance) revert InsufficientTreasuryBalance();
        treasuryBalance -= amount;
        (bool success, ) = payable(to).call{value: amount}("");
        if (!success) revert TransferFailed();
        emit TreasuryWithdrawn(msg.sender, amount, to);
    }

    // --- View Functions ---

    function verifySkill(address user, string calldata topic) external view returns (bool, uint256, uint256) {
        bytes32 topicHash = keccak256(bytes(topic));
        Attestation memory att = attestations[user][topicHash];
        return (att.isValid, att.score, att.timestamp);
    }

    function getStakeDetails(address user, string calldata topic) external view returns (StakeInfo memory) {
        bytes32 topicHash = keccak256(bytes(topic));
        return stakes[user][topicHash];
    }

    function getDomainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    function getTreasuryBalance() external view returns (uint256) {
        return treasuryBalance;
    }
}
