// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import "../src/RTFMVerifiableRegistry.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract RTFMRegistryTest is Test {
    using ECDSA for bytes32;

    RTFMVerifiableRegistry public registry;
    uint256 public teePrivateKey;
    address public teeAddress;
    address public user;
    address public deployer;

    // Domain Separator Constants
    bytes32 public constant ATTESTATION_TYPEHASH = keccak256("Attestation(address user,string topic,uint256 score,uint256 nonce,uint256 deadline)");
    bytes32 public DOMAIN_SEPARATOR;

    function setUp() public {
        deployer = address(this);
        registry = new RTFMVerifiableRegistry();
        
        teePrivateKey = 0xA11CE;
        teeAddress = vm.addr(teePrivateKey);
        user = address(0x123);
        vm.deal(user, 10 ether);

        // Enroll TEE
        registry.enrollTEE(teeAddress, hex"00"); // PoP ignored in MVP
        
        vm.prank(teeAddress);
        registry.activateTEE();

        DOMAIN_SEPARATOR = registry.getDomainSeparator();
    }

    // --- Happy Path Tests ---

    function test_Stake_Success() public {
        vm.startPrank(user);
        registry.stakeForChallenge{value: 0.001 ether}("Solidity");
        
        IRTFMSovereign.StakeInfo memory stake = registry.getStakeDetails(user, "Solidity");
        
        assertEq(stake.amount, 0.001 ether);
        assertEq(uint8(stake.state), uint8(IRTFMSovereign.State.Staked));
        vm.stopPrank();
    }

    function test_FullFlow_Pass() public {
        // 1. Stake
        vm.prank(user);
        registry.stakeForChallenge{value: 0.001 ether}("Solidity");

        // 2. Initiate
        vm.prank(teeAddress);
        registry.initiateChallenge(user, "Solidity", bytes32("QmHash"));
        
        // 3. Submit Attestation (Score 80)
        uint256 score = 80;
        uint256 nonce = 0;
        uint256 deadline = block.timestamp + 1 hours;
        
        bytes32 structHash = keccak256(abi.encode(
            ATTESTATION_TYPEHASH,
            user,
            keccak256(bytes("Solidity")),
            score,
            nonce,
            deadline
        ));
        
        bytes32 digest = keccak256(abi.encodePacked(
            "\x19\x01",
            DOMAIN_SEPARATOR,
            structHash
        ));
        
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(teePrivateKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.prank(teeAddress);
        registry.submitAttestation(user, "Solidity", score, nonce, deadline, signature);

        // Check Payout (80% returned)
        // 0.001 * 0.8 = 0.0008
        assertEq(user.balance, 10 ether - 0.001 ether + 0.0008 ether);
        assertEq(registry.getTreasuryBalance(), 0.0002 ether);
    }

    // --- Failure Tests ---

    function test_Stake_WrongAmount_Reverts() public {
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(IRTFMErrors.InvalidStakeAmount.selector, 0.002 ether, 0.001 ether));
        registry.stakeForChallenge{value: 0.002 ether}("Solidity");
    }

    function test_Attestation_InvalidSignature_Reverts() public {
        vm.prank(user);
        registry.stakeForChallenge{value: 0.001 ether}("Solidity");

        vm.prank(teeAddress);
        registry.initiateChallenge(user, "Solidity", bytes32("QmHash"));

        // Sign with WRONG key
        uint256 wrongKey = 0xB0B;
        // Construct a valid digest but signed by wrong key
        uint256 score = 80;
        uint256 nonce = 0;
        uint256 deadline = block.timestamp + 1 hours;
        bytes32 structHash = keccak256(abi.encode(
            ATTESTATION_TYPEHASH,
            user,
            keccak256(bytes("Solidity")),
            score,
            nonce,
            deadline
        ));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
        
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(wrongKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.prank(teeAddress);
        vm.expectRevert(IRTFMErrors.InvalidSignature.selector);
        registry.submitAttestation(user, "Solidity", 80, 0, deadline, signature);
    }

    function test_EmergencyRefund_BeforeTimeout_Reverts() public {
        vm.prank(user);
        registry.stakeForChallenge{value: 0.001 ether}("Solidity");

        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(IRTFMErrors.ChallengeNotExpired.selector, block.timestamp + 7 days));
        registry.emergencyRefund("Solidity");
    }

    function test_EmergencyRefund_AfterTimeout_Success() public {
        vm.prank(user);
        registry.stakeForChallenge{value: 0.001 ether}("Solidity");

        vm.warp(block.timestamp + 8 days);

        vm.prank(user);
        registry.emergencyRefund("Solidity");

        // 95% refund
        // 0.001 * 0.95 = 0.00095
        assertEq(user.balance, 10 ether - 0.001 ether + 0.00095 ether);
        assertEq(registry.getTreasuryBalance(), 0.00005 ether);
    }
}
