// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/SkillStaking.sol";
import "../src/SkillAttestation.sol";

contract SkillStakingTest is Test {
    SkillStaking public staking;
    SkillAttestation public attestation;

    address public teeSigner;
    uint256 public teePrivateKey;
    address public user;
    address public owner;

    // EIP-712 Domain Separator
    bytes32 public DOMAIN_SEPARATOR;
    bytes32 public constant ATTESTATION_TYPEHASH = keccak256("Attestation(address user,string skill,uint256 score,uint256 nonce)");

    function setUp() public {
        // Setup accounts
        (teeSigner, teePrivateKey) = makeAddrAndKey("teeSigner");
        user = makeAddr("user");
        owner = address(this);

        // Deploy contracts
        attestation = new SkillAttestation(teeSigner);
        staking = new SkillStaking(teeSigner);

        // Fund user
        vm.deal(user, 1 ether);
        
        // Calculate Domain Separator
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("RTFM-Sovereign")),
                keccak256(bytes("1")),
                block.chainid,
                address(attestation)
            )
        );
    }

    function testStake() public {
        vm.prank(user);
        staking.stake{value: 0.001 ether}("react-card");

        (uint256 amount,,,,,) = staking.stakes(user, "react-card");
        assertEq(amount, 0.001 ether);
    }

    function testFailStakeIncorrectAmount() public {
        vm.prank(user);
        staking.stake{value: 0.0001 ether}("react-card");
    }

    function testFailDoubleStake() public {
        vm.prank(user);
        staking.stake{value: 0.001 ether}("react-card");
        
        vm.prank(user);
        staking.stake{value: 0.001 ether}("react-card");
    }

    function testRecordMilestone() public {
        // First stake
        vm.prank(user);
        staking.stake{value: 0.001 ether}("react-card");

        // Record milestone by TEE
        vm.prank(teeSigner);
        staking.recordMilestone(user, "react-card", 1);

        (,,uint256 checkpoint,,,) = staking.stakes(user, "react-card");
        assertEq(checkpoint, 1);
    }

    function testFailRecordMilestoneNotTEE() public {
        vm.prank(user);
        staking.stake{value: 0.001 ether}("react-card");

        vm.prank(user); // Not TEE
        staking.recordMilestone(user, "react-card", 1);
    }

    function testAttestation() public {
        string memory skill = "react-card";
        uint256 score = 85;
        string memory ipfsHash = "QmHash";
        uint256[] memory milestones = new uint256[](1);
        milestones[0] = 85;

        // Prepare signature
        bytes32 structHash = keccak256(abi.encode(
            ATTESTATION_TYPEHASH,
            user,
            keccak256(bytes(skill)),
            score,
            0 // nonce placeholder
        ));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(teePrivateKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        // Submit attestation by TEE
        vm.prank(teeSigner);
        attestation.submitAttestation(user, skill, score, signature, ipfsHash, milestones);

        (bool exists, uint256 storedScore,,) = attestation.verifyAttestation(user, skill);
        assertTrue(exists);
        assertEq(storedScore, score);
    }

    function testRefundPass() public {
        // Stake
        vm.prank(user);
        staking.stake{value: 0.001 ether}("react-card");

        // Claim Refund by TEE (Score 80 >= 70)
        vm.prank(teeSigner);
        staking.claimRefund(user, "react-card", 80);

        // User should have 0.999 + 0.0008 = 0.9998 ETH
        // Initial 1 ETH - 0.001 ETH stake = 0.999 ETH
        // Refund 80% of 0.001 = 0.0008 ETH
        assertEq(user.balance, 0.9998 ether);
    }

    function testRefundFail() public {
        // Stake
        vm.prank(user);
        staking.stake{value: 0.001 ether}("react-card");

        // Claim Refund by TEE (Score 50 < 70)
        vm.prank(teeSigner);
        staking.claimRefund(user, "react-card", 50);

        // User should have 0.999 + 0.0002 = 0.9992 ETH
        // Refund 20% of 0.001 = 0.0002 ETH
        assertEq(user.balance, 0.9992 ether);
    }
}
