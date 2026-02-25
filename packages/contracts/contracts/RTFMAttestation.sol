// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IRTFMStaking.sol";

/**
 * @title RTFMAttestation
 * @dev On-chain checkpoint system for milestone progress tracking with TEE signatures.
 *      Records immutable milestone achievements that can be verified by any party.
 *
 * Key Features:
 * - EIP-712 typed data signature verification
 * - Session-based checkpoint tracking
 * - Automatic checkpoint creation at milestones 3, 5, 7
 * - IPFS code snapshot linking
 * - Replay attack prevention via timestamp validation
 * - Pagination support for efficient queries
 */
contract RTFMAttestation is EIP712, Ownable, ReentrancyGuard {
    using ECDSA for bytes32;

    /// @notice Checkpoint data structure
    struct Checkpoint {
        address user;           // User wallet address
        bytes32 sessionId;      // Session identifier
        uint8 milestoneId;      // Milestone ID (3, 5, or 7)
        uint256 timestamp;      // Block timestamp
        bytes32 ipfsHash;       // IPFS hash of code snapshot
        bytes signature;        // TEE signature
        bool verified;          // Verification status
    }

    /// @notice Data structure for EIP-712 signing
    struct CheckpointData {
        address user;
        bytes32 sessionId;
        uint8 milestoneId;
        uint256 timestamp;
        bytes32 ipfsHash;
        bytes32 codeHash;       // Hash of code snapshot content
    }

    // State variables
    address public teeSigner;
    address public stakingContract;

    /// @notice Checkpoint storage: key => Checkpoint
    /// Key: keccak256(abi.encodePacked(user, sessionId, milestoneId))
    mapping(bytes32 => Checkpoint) public checkpoints;

    /// @notice User to checkpoint keys mapping
    mapping(address => bytes32[]) public userCheckpoints;

    /// @notice Session to checkpoint keys mapping
    mapping(bytes32 => bytes32[]) public sessionCheckpoints;

    /// @notice Emitted when a checkpoint is successfully created
    event CheckpointCreated(
        address indexed user,
        bytes32 indexed sessionId,
        uint8 indexed milestoneId,
        uint256 timestamp,
        bytes32 ipfsHash
    );

    /// @notice Emitted when checkpoint creation fails
    event CheckpointFailed(
        address indexed user,
        bytes32 indexed sessionId,
        uint8 indexed milestoneId,
        string reason
    );

    /// @notice Emitted when TEE signer is updated
    event TEESignerUpdated(
        address indexed oldSigner,
        address indexed newSigner,
        uint256 timestamp
    );

    /// @notice Emitted when staking contract is updated
    event StakingContractUpdated(
        address indexed oldContract,
        address indexed newContract,
        uint256 timestamp
    );

    /// @notice EIP-712 type hash for CheckpointData
    bytes32 private constant CHECKPOINT_TYPEHASH = keccak256(
        "CheckpointData(address user,bytes32 sessionId,uint8 milestoneId,uint256 timestamp,bytes32 ipfsHash,bytes32 codeHash)"
    );

    /// @notice Timestamp validity period (24 hours)
    uint256 private constant TIMESTAMP_VALIDITY_PERIOD = 24 hours;

    /**
     * @notice Constructor
     * @param _teeSigner The TEE signer address
     * @param _stakingContract The staking contract address
     */
    constructor(address _teeSigner, address _stakingContract)
        EIP712("RTFMAttestation", "1")
        Ownable(msg.sender)
    {
        require(_teeSigner != address(0), "Invalid TEE signer");
        teeSigner = _teeSigner;
        stakingContract = _stakingContract;
    }

    /**
     * @notice Updates the TEE signer address
     * @param _newSigner The new TEE signer address
     */
    function updateTEESigner(address _newSigner) external onlyOwner {
        require(_newSigner != address(0), "Invalid address");
        address oldSigner = teeSigner;
        teeSigner = _newSigner;
        emit TEESignerUpdated(oldSigner, _newSigner, block.timestamp);
    }

    /**
     * @notice Sets the staking contract address
     * @param _stakingContract The staking contract address
     */
    function setStakingContract(address _stakingContract) external onlyOwner {
        require(_stakingContract != address(0), "Invalid address");
        address oldContract = stakingContract;
        stakingContract = _stakingContract;
        emit StakingContractUpdated(oldContract, _stakingContract, block.timestamp);
    }

    /**
     * @notice Records a checkpoint with TEE signature verification
     * @param _user The user address
     * @param _sessionId The session identifier
     * @param _milestoneId The milestone ID (3, 5, or 7)
     * @param _timestamp The timestamp
     * @param _ipfsHash The IPFS hash of code snapshot
     * @param _codeHash The hash of code snapshot content
     * @param _signature The TEE signature (65 bytes)
     */
    function recordCheckpoint(
        address _user,
        bytes32 _sessionId,
        uint8 _milestoneId,
        uint256 _timestamp,
        bytes32 _ipfsHash,
        bytes32 _codeHash,
        bytes calldata _signature
    ) external nonReentrant {
        // Verify milestone ID is valid (3, 5, or 7)
        require(
            _milestoneId == 3 || _milestoneId == 5 || _milestoneId == 7,
            "Invalid milestone ID"
        );

        // Verify signature length
        require(_signature.length == 65, "Invalid signature length");

        // Verify not already recorded
        bytes32 checkpointKey = _getCheckpointKey(_user, _sessionId, _milestoneId);
        require(checkpoints[checkpointKey].timestamp == 0, "Checkpoint already recorded");

        // Verify timestamp (prevent replay attacks)
        require(_timestamp <= block.timestamp, "Future timestamp");
        require(
            _timestamp > block.timestamp - TIMESTAMP_VALIDITY_PERIOD,
            "Timestamp too old"
        );

        // Verify user is staked (if staking contract is set)
        if (stakingContract != address(0)) {
            // We can't directly call the staking contract here without knowing the skill topic
            // This check can be done off-chain or the caller can provide the skill topic
            // For now, we rely on the TEE to only submit valid checkpoints
        }

        // Verify signature
        CheckpointData memory data = CheckpointData({
            user: _user,
            sessionId: _sessionId,
            milestoneId: _milestoneId,
            timestamp: _timestamp,
            ipfsHash: _ipfsHash,
            codeHash: _codeHash
        });

        bytes32 digest = _hashCheckpoint(data);
        address signer = digest.recover(_signature);

        require(signer == teeSigner, "Invalid TEE signature");

        // Record checkpoint
        checkpoints[checkpointKey] = Checkpoint({
            user: _user,
            sessionId: _sessionId,
            milestoneId: _milestoneId,
            timestamp: _timestamp,
            ipfsHash: _ipfsHash,
            signature: _signature,
            verified: true
        });

        // Update mappings
        userCheckpoints[_user].push(checkpointKey);
        sessionCheckpoints[_sessionId].push(checkpointKey);

        // Emit event
        emit CheckpointCreated(_user, _sessionId, _milestoneId, _timestamp, _ipfsHash);
    }

    /**
     * @notice Gets a single checkpoint
     * @param _user The user address
     * @param _sessionId The session identifier
     * @param _milestoneId The milestone ID
     * @return The checkpoint data
     */
    function getCheckpoint(
        address _user,
        bytes32 _sessionId,
        uint8 _milestoneId
    ) external view returns (Checkpoint memory) {
        bytes32 key = _getCheckpointKey(_user, _sessionId, _milestoneId);
        return checkpoints[key];
    }

    /**
     * @notice Gets all checkpoints for a user with pagination
     * @param _user The user address
     * @param _offset The offset
     * @param _limit The limit
     * @return Array of checkpoints
     */
    function getUserCheckpointsPaginated(
        address _user,
        uint256 _offset,
        uint256 _limit
    ) external view returns (Checkpoint[] memory) {
        bytes32[] storage keys = userCheckpoints[_user];
        uint256 end = _offset + _limit;
        if (end > keys.length) end = keys.length;
        if (_offset >= keys.length) {
            return new Checkpoint[](0);
        }

        Checkpoint[] memory result = new Checkpoint[](end - _offset);
        for (uint256 i = _offset; i < end; i++) {
            result[i - _offset] = checkpoints[keys[i]];
        }
        return result;
    }

    /**
     * @notice Gets total checkpoint count for a user
     * @param _user The user address
     * @return The count
     */
    function getUserCheckpointsCount(address _user) external view returns (uint256) {
        return userCheckpoints[_user].length;
    }

    /**
     * @notice Gets all checkpoints for a session with pagination
     * @param _sessionId The session identifier
     * @param _offset The offset
     * @param _limit The limit
     * @return Array of checkpoints
     */
    function getSessionCheckpointsPaginated(
        bytes32 _sessionId,
        uint256 _offset,
        uint256 _limit
    ) external view returns (Checkpoint[] memory) {
        bytes32[] storage keys = sessionCheckpoints[_sessionId];
        uint256 end = _offset + _limit;
        if (end > keys.length) end = keys.length;
        if (_offset >= keys.length) {
            return new Checkpoint[](0);
        }

        Checkpoint[] memory result = new Checkpoint[](end - _offset);
        for (uint256 i = _offset; i < end; i++) {
            result[i - _offset] = checkpoints[keys[i]];
        }
        return result;
    }

    /**
     * @notice Gets total checkpoint count for a session
     * @param _sessionId The session identifier
     * @return The count
     */
    function getSessionCheckpointsCount(
        bytes32 _sessionId
    ) external view returns (uint256) {
        return sessionCheckpoints[_sessionId].length;
    }

    /**
     * @notice Checks if a checkpoint exists
     * @param _user The user address
     * @param _sessionId The session identifier
     * @param _milestoneId The milestone ID
     * @return True if exists
     */
    function checkpointExists(
        address _user,
        bytes32 _sessionId,
        uint8 _milestoneId
    ) external view returns (bool) {
        bytes32 key = _getCheckpointKey(_user, _sessionId, _milestoneId);
        return checkpoints[key].timestamp != 0;
    }

    /**
     * @notice Hashes checkpoint data for EIP-712 signing
     * @param _data The checkpoint data
     * @return The typed data hash
     */
    function _hashCheckpoint(CheckpointData memory _data) private view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(
                abi.encode(
                    CHECKPOINT_TYPEHASH,
                    _data.user,
                    _data.sessionId,
                    _data.milestoneId,
                    _data.timestamp,
                    _data.ipfsHash,
                    _data.codeHash
                )
            )
        );
    }

    /**
     * @notice Gets the checkpoint key
     * @param _user The user address
     * @param _sessionId The session identifier
     * @param _milestoneId The milestone ID
     * @return The checkpoint key
     */
    function _getCheckpointKey(
        address _user,
        bytes32 _sessionId,
        uint8 _milestoneId
    ) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(_user, _sessionId, _milestoneId));
    }
}
