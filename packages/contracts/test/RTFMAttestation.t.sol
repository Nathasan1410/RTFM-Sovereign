// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import "../contracts/RTFMAttestation.sol";

/**
 * @title RTFMAttestationTest
 * @dev Test suite for RTFMAttestation contract
 */
contract RTFMAttestationTest is Test {
    RTFMAttestation public attestation;
    
    uint256 public teePrivateKey;
    address public teeAddress;
    address public user;
    address public owner;
    address public stakingContract;
    
    bytes32 public constant DOMAIN_SEPARATOR = 0x0000000000000000000000000000000000000000000000000000000000000000;
    
    // EIP-712 TypeHash
    bytes32 private constant CHECKPOINT_TYPEHASH = keccak256(
        "CheckpointData(address user,bytes32 sessionId,uint8 milestoneId,uint256 timestamp,bytes32 ipfsHash,bytes32 codeHash)"
    );

    function setUp() public {
        owner = address(this);
        teePrivateKey = 0xA11CE;
        teeAddress = vm.addr(teePrivateKey);
        user = address(0x123);
        stakingContract = address(0x456);
        
        vm.deal(user, 10 ether);
        
        // Deploy contract
        attestation = new RTFMAttestation(teeAddress, stakingContract);
        
        DOMAIN_SEPARATOR = attestation.getDomainSeparator();
    }

    // ==================== CONSTRUCTOR TESTS ====================

    function test_Constructor_Success() public {
        assertEq(attestation.teeSigner(), teeAddress);
        assertEq(attestation.stakingContract(), stakingContract);
        assertEq(attestation.owner(), owner);
    }

    function test_Constructor_InvalidTEEAddress_Reverts() public {
        vm.expectRevert("Invalid TEE signer");
        new RTFMAttestation(address(0), stakingContract);
    }

    // ==================== RECORD CHECKPOINT TESTS ====================

    function test_RecordCheckpoint_Success() public {
        bytes32 sessionId = keccak256(bytes("test-session-001"));
        uint8 milestoneId = 3;
        uint256 timestamp = block.timestamp;
        bytes32 ipfsHash = keccak256(bytes("QmTest123456789"));
        bytes32 codeHash = keccak256(bytes("codeSnapshotHash"));
        
        // Create signature
        bytes memory signature = _createCheckpointSignature(
            user,
            sessionId,
            milestoneId,
            timestamp,
            ipfsHash,
            codeHash
        );
        
        // Record checkpoint
        vm.prank(teeAddress);
        vm.expectEmit(true, true, true, true);
        emit RTFMAttestation.CheckpointCreated(
            user,
            sessionId,
            milestoneId,
            timestamp,
            ipfsHash
        );
        attestation.recordCheckpoint(
            user,
            sessionId,
            milestoneId,
            timestamp,
            ipfsHash,
            codeHash,
            signature
        );
        
        // Verify checkpoint
        RTFMAttestation.Checkpoint memory checkpoint = attestation.getCheckpoint(
            user,
            sessionId,
            milestoneId
        );
        
        assertEq(checkpoint.user, user);
        assertEq(checkpoint.sessionId, sessionId);
        assertEq(checkpoint.milestoneId, milestoneId);
        assertEq(checkpoint.timestamp, timestamp);
        assertEq(checkpoint.ipfsHash, ipfsHash);
        assertTrue(checkpoint.verified);
    }

    function test_RecordCheckpoint_Milestone3_Success() public {
        _testRecordCheckpointWithMilestone(3);
    }

    function test_RecordCheckpoint_Milestone5_Success() public {
        _testRecordCheckpointWithMilestone(5);
    }

    function test_RecordCheckpoint_Milestone7_Success() public {
        _testRecordCheckpointWithMilestone(7);
    }

    function _testRecordCheckpointWithMilestone(uint8 milestoneId) internal {
        bytes32 sessionId = keccak256(bytes("test-session-001"));
        uint256 timestamp = block.timestamp;
        bytes32 ipfsHash = keccak256(bytes("QmTest123456789"));
        bytes32 codeHash = keccak256(bytes("codeSnapshotHash"));
        
        bytes memory signature = _createCheckpointSignature(
            user,
            sessionId,
            milestoneId,
            timestamp,
            ipfsHash,
            codeHash
        );
        
        vm.prank(teeAddress);
        attestation.recordCheckpoint(
            user,
            sessionId,
            milestoneId,
            timestamp,
            ipfsHash,
            codeHash,
            signature
        );
        
        RTFMAttestation.Checkpoint memory checkpoint = attestation.getCheckpoint(
            user,
            sessionId,
            milestoneId
        );
        
        assertEq(checkpoint.milestoneId, milestoneId);
        assertTrue(checkpoint.verified);
    }

    // ==================== FAILURE TESTS ====================

    function test_RecordCheckpoint_InvalidMilestone_Reverts() public {
        bytes32 sessionId = keccak256(bytes("test-session-001"));
        uint8 milestoneId = 4; // Invalid milestone
        uint256 timestamp = block.timestamp;
        bytes32 ipfsHash = keccak256(bytes("QmTest123456789"));
        bytes32 codeHash = keccak256(bytes("codeSnapshotHash"));
        
        bytes memory signature = _createCheckpointSignature(
            user,
            sessionId,
            milestoneId,
            timestamp,
            ipfsHash,
            codeHash
        );
        
        vm.prank(teeAddress);
        vm.expectRevert("Invalid milestone ID");
        attestation.recordCheckpoint(
            user,
            sessionId,
            milestoneId,
            timestamp,
            ipfsHash,
            codeHash,
            signature
        );
    }

    function test_RecordCheckpoint_InvalidSignatureLength_Reverts() public {
        bytes32 sessionId = keccak256(bytes("test-session-001"));
        uint8 milestoneId = 3;
        uint256 timestamp = block.timestamp;
        bytes32 ipfsHash = keccak256(bytes("QmTest123456789"));
        bytes32 codeHash = keccak256(bytes("codeSnapshotHash"));
        
        vm.prank(teeAddress);
        vm.expectRevert("Invalid signature length");
        attestation.recordCheckpoint(
            user,
            sessionId,
            milestoneId,
            timestamp,
            ipfsHash,
            codeHash,
            hex"1234" // Invalid signature length
        );
    }

    function test_RecordCheckpoint_DuplicateCheckpoint_Reverts() public {
        bytes32 sessionId = keccak256(bytes("test-session-001"));
        uint8 milestoneId = 3;
        uint256 timestamp = block.timestamp;
        bytes32 ipfsHash = keccak256(bytes("QmTest123456789"));
        bytes32 codeHash = keccak256(bytes("codeSnapshotHash"));
        
        bytes memory signature = _createCheckpointSignature(
            user,
            sessionId,
            milestoneId,
            timestamp,
            ipfsHash,
            codeHash
        );
        
        // First checkpoint - success
        vm.prank(teeAddress);
        attestation.recordCheckpoint(
            user,
            sessionId,
            milestoneId,
            timestamp,
            ipfsHash,
            codeHash,
            signature
        );
        
        // Second checkpoint - should revert
        vm.prank(teeAddress);
        vm.expectRevert("Checkpoint already recorded");
        attestation.recordCheckpoint(
            user,
            sessionId,
            milestoneId,
            timestamp,
            ipfsHash,
            codeHash,
            signature
        );
    }

    function test_RecordCheckpoint_FutureTimestamp_Reverts() public {
        bytes32 sessionId = keccak256(bytes("test-session-001"));
        uint8 milestoneId = 3;
        uint256 timestamp = block.timestamp + 1 days; // Future timestamp
        bytes32 ipfsHash = keccak256(bytes("QmTest123456789"));
        bytes32 codeHash = keccak256(bytes("codeSnapshotHash"));
        
        bytes memory signature = _createCheckpointSignature(
            user,
            sessionId,
            milestoneId,
            timestamp,
            ipfsHash,
            codeHash
        );
        
        vm.prank(teeAddress);
        vm.expectRevert("Future timestamp");
        attestation.recordCheckpoint(
            user,
            sessionId,
            milestoneId,
            timestamp,
            ipfsHash,
            codeHash,
            signature
        );
    }

    function test_RecordCheckpoint_TimestampTooOld_Reverts() public {
        bytes32 sessionId = keccak256(bytes("test-session-001"));
        uint8 milestoneId = 3;
        uint256 timestamp = block.timestamp - 2 days; // Too old
        bytes32 ipfsHash = keccak256(bytes("QmTest123456789"));
        bytes32 codeHash = keccak256(bytes("codeSnapshotHash"));
        
        bytes memory signature = _createCheckpointSignature(
            user,
            sessionId,
            milestoneId,
            timestamp,
            ipfsHash,
            codeHash
        );
        
        vm.prank(teeAddress);
        vm.expectRevert("Timestamp too old");
        attestation.recordCheckpoint(
            user,
            sessionId,
            milestoneId,
            timestamp,
            ipfsHash,
            codeHash,
            signature
        );
    }

    function test_RecordCheckpoint_InvalidSignature_Reverts() public {
        bytes32 sessionId = keccak256(bytes("test-session-001"));
        uint8 milestoneId = 3;
        uint256 timestamp = block.timestamp;
        bytes32 ipfsHash = keccak256(bytes("QmTest123456789"));
        bytes32 codeHash = keccak256(bytes("codeSnapshotHash"));
        
        // Create signature with wrong private key
        uint256 wrongPrivateKey = 0xBAD;
        bytes memory signature = _createCheckpointSignatureWithKey(
            wrongPrivateKey,
            user,
            sessionId,
            milestoneId,
            timestamp,
            ipfsHash,
            codeHash
        );
        
        vm.prank(teeAddress);
        vm.expectRevert("Invalid TEE signature");
        attestation.recordCheckpoint(
            user,
            sessionId,
            milestoneId,
            timestamp,
            ipfsHash,
            codeHash,
            signature
        );
    }

    function test_RecordCheckpoint_NonTEEAddress_Reverts() public {
        bytes32 sessionId = keccak256(bytes("test-session-001"));
        uint8 milestoneId = 3;
        uint256 timestamp = block.timestamp;
        bytes32 ipfsHash = keccak256(bytes("QmTest123456789"));
        bytes32 codeHash = keccak256(bytes("codeSnapshotHash"));
        
        bytes memory signature = _createCheckpointSignature(
            user,
            sessionId,
            milestoneId,
            timestamp,
            ipfsHash,
            codeHash
        );
        
        // Call from non-TEE address
        vm.expectRevert();
        attestation.recordCheckpoint(
            user,
            sessionId,
            milestoneId,
            timestamp,
            ipfsHash,
            codeHash,
            signature
        );
    }

    // ==================== GETTER TESTS ====================

    function test_GetCheckpoint_NotExists() public {
        bytes32 sessionId = keccak256(bytes("test-session-001"));
        uint8 milestoneId = 3;
        
        RTFMAttestation.Checkpoint memory checkpoint = attestation.getCheckpoint(
            user,
            sessionId,
            milestoneId
        );
        
        assertEq(checkpoint.timestamp, 0);
        assertFalse(checkpoint.verified);
    }

    function test_CheckpointExists() public {
        bytes32 sessionId = keccak256(bytes("test-session-001"));
        uint8 milestoneId = 3;
        uint256 timestamp = block.timestamp;
        bytes32 ipfsHash = keccak256(bytes("QmTest123456789"));
        bytes32 codeHash = keccak256(bytes("codeSnapshotHash"));
        
        bytes memory signature = _createCheckpointSignature(
            user,
            sessionId,
            milestoneId,
            timestamp,
            ipfsHash,
            codeHash
        );
        
        // Before recording
        assertFalse(attestation.checkpointExists(user, sessionId, milestoneId));
        
        // After recording
        vm.prank(teeAddress);
        attestation.recordCheckpoint(
            user,
            sessionId,
            milestoneId,
            timestamp,
            ipfsHash,
            codeHash,
            signature
        );
        
        assertTrue(attestation.checkpointExists(user, sessionId, milestoneId));
    }

    // ==================== PAGINATION TESTS ====================

    function test_GetUserCheckpointsPaginated() public {
        // Create multiple checkpoints for user
        _createCheckpoint(user, keccak256(bytes("session-1")), 3);
        _createCheckpoint(user, keccak256(bytes("session-2")), 5);
        _createCheckpoint(user, keccak256(bytes("session-3")), 7);
        
        // Get all checkpoints
        RTFMAttestation.Checkpoint[] memory checkpoints = attestation.getUserCheckpointsPaginated(
            user,
            0,
            10
        );
        
        assertEq(checkpoints.length, 3);
        
        // Get with pagination
        checkpoints = attestation.getUserCheckpointsPaginated(user, 0, 2);
        assertEq(checkpoints.length, 2);
        
        checkpoints = attestation.getUserCheckpointsPaginated(user, 2, 10);
        assertEq(checkpoints.length, 1);
    }

    function test_GetSessionCheckpointsPaginated() public {
        bytes32 sessionId = keccak256(bytes("session-1"));
        
        // Create multiple checkpoints for same session (different users)
        _createCheckpoint(address(0x1), sessionId, 3);
        _createCheckpoint(address(0x2), sessionId, 5);
        _createCheckpoint(address(0x3), sessionId, 7);
        
        // Get all checkpoints
        RTFMAttestation.Checkpoint[] memory checkpoints = attestation.getSessionCheckpointsPaginated(
            sessionId,
            0,
            10
        );
        
        assertEq(checkpoints.length, 3);
        
        // Get with pagination
        checkpoints = attestation.getSessionCheckpointsPaginated(sessionId, 0, 2);
        assertEq(checkpoints.length, 2);
    }

    function test_GetUserCheckpointsCount() public {
        assertEq(attestation.getUserCheckpointsCount(user), 0);
        
        _createCheckpoint(user, keccak256(bytes("session-1")), 3);
        _createCheckpoint(user, keccak256(bytes("session-2")), 5);
        
        assertEq(attestation.getUserCheckpointsCount(user), 2);
    }

    function test_GetSessionCheckpointsCount() public {
        bytes32 sessionId = keccak256(bytes("session-1"));
        assertEq(attestation.getSessionCheckpointsCount(sessionId), 0);
        
        _createCheckpoint(user, sessionId, 3);
        _createCheckpoint(address(0x2), sessionId, 5);
        
        assertEq(attestation.getSessionCheckpointsCount(sessionId), 2);
    }

    // ==================== ADMIN FUNCTION TESTS ====================

    function test_UpdateTEESigner_Success() public {
        address newTEESigner = address(0x789);
        
        vm.expectEmit(true, true, true, true);
        emit RTFMAttestation.TEESignerUpdated(teeAddress, newTEESigner, block.timestamp);
        
        attestation.updateTEESigner(newTEESigner);
        
        assertEq(attestation.teeSigner(), newTEESigner);
    }

    function test_UpdateTEESigner_InvalidAddress_Reverts() public {
        vm.expectRevert("Invalid address");
        attestation.updateTEESigner(address(0));
    }

    function test_UpdateTEESigner_NonOwner_Reverts() public {
        address newTEESigner = address(0x789);
        address nonOwner = address(0x999);
        
        vm.prank(nonOwner);
        vm.expectRevert();
        attestation.updateTEESigner(newTEESigner);
    }

    function test_SetStakingContract_Success() public {
        address newStakingContract = address(0xABC);
        
        vm.expectEmit(true, true, true, true);
        emit RTFMAttestation.StakingContractUpdated(stakingContract, newStakingContract, block.timestamp);
        
        attestation.setStakingContract(newStakingContract);
        
        assertEq(attestation.stakingContract(), newStakingContract);
    }

    function test_SetStakingContract_InvalidAddress_Reverts() public {
        vm.expectRevert("Invalid address");
        attestation.setStakingContract(address(0));
    }

    // ==================== HELPER FUNCTIONS ====================

    function _createCheckpointSignature(
        address _user,
        bytes32 _sessionId,
        uint8 _milestoneId,
        uint256 _timestamp,
        bytes32 _ipfsHash,
        bytes32 _codeHash
    ) internal view returns (bytes memory) {
        return _createCheckpointSignatureWithKey(
            teePrivateKey,
            _user,
            _sessionId,
            _milestoneId,
            _timestamp,
            _ipfsHash,
            _codeHash
        );
    }

    function _createCheckpointSignatureWithKey(
        uint256 _privateKey,
        address _user,
        bytes32 _sessionId,
        uint8 _milestoneId,
        uint256 _timestamp,
        bytes32 _ipfsHash,
        bytes32 _codeHash
    ) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(abi.encode(
            CHECKPOINT_TYPEHASH,
            _user,
            _sessionId,
            _milestoneId,
            _timestamp,
            _ipfsHash,
            _codeHash
        ));
        
        bytes32 digest = _hashTypedDataV4(structHash);
        
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(_privateKey, digest);
        
        return abi.encodePacked(r, s, v);
    }

    function _hashTypedDataV4(bytes32 structHash) internal view returns (bytes32) {
        return keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
    }

    function _createCheckpoint(
        address _user,
        bytes32 _sessionId,
        uint8 _milestoneId
    ) internal {
        uint256 timestamp = block.timestamp;
        bytes32 ipfsHash = keccak256(bytes("QmTest123456789"));
        bytes32 codeHash = keccak256(bytes("codeSnapshotHash"));
        
        bytes memory signature = _createCheckpointSignature(
            _user,
            _sessionId,
            _milestoneId,
            timestamp,
            ipfsHash,
            codeHash
        );
        
        vm.prank(teeAddress);
        attestation.recordCheckpoint(
            _user,
            _sessionId,
            _milestoneId,
            timestamp,
            ipfsHash,
            codeHash,
            signature
        );
    }
}
