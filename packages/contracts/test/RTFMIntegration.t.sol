// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import "../src/RTFMVerifiableRegistry.sol";

contract RTFMIntegrationTest is Test {
    RTFMVerifiableRegistry public registry;
    uint256 public constant STAKE_AMOUNT = 0.001 ether;
    bytes32 constant ATTESTATION_TYPEHASH = keccak256("Attestation(address user,string topic,uint256 score,uint256 nonce,uint256 deadline)");
    
    uint256 teePrivateKey;
    address tee;
    address user;

    function setUp() public {
        teePrivateKey = 0xA11CE;
        tee = vm.addr(teePrivateKey);
        user = makeAddr("user");
        vm.deal(user, 10 ether);
        vm.deal(tee, 1 ether); // TEE needs gas

        registry = new RTFMVerifiableRegistry(); // EIP712 args in constructor? No, logic in constructor.
        // Wait, constructor() EIP712("RTFMVerifiableRegistry", "1") is correct.
        
        registry.enrollTEE(tee, "mock-pop");
        
        vm.prank(tee);
        registry.activateTEE();
    }

    function test_StakeFlow() public {
        vm.startPrank(user);
        registry.stakeForChallenge{value: STAKE_AMOUNT}("test-topic");
        
        bytes32 topicHash = keccak256(bytes("test-topic"));
        IRTFMSovereign.StakeInfo memory stake = registry.getStakeDetails(user, "test-topic");
        uint256 amount = stake.amount;
        IRTFMSovereign.State status = stake.state;
        
        assertEq(amount, STAKE_AMOUNT);
        assertEq(uint8(status), uint8(IRTFMSovereign.State.Staked));
        vm.stopPrank();
    }

    function test_AttestationRecording() public {
        // 1. Stake
        vm.prank(user);
        registry.stakeForChallenge{value: STAKE_AMOUNT}("test-topic");
        
        bytes32 topicHash = keccak256(bytes("test-topic"));

        // 2. Initiate
        vm.prank(tee);
        registry.initiateChallenge(user, "test-topic", bytes32(uint256(123)));

        // 3. Prepare Data
        uint256 score = 85;
        uint256 nonce = 0;
        uint256 deadline = block.timestamp + 1 hours;

        // 4. Sign
        bytes32 structHash = keccak256(abi.encode(
            ATTESTATION_TYPEHASH,
            user,
            topicHash,
            score,
            nonce,
            deadline
        ));
        
        bytes32 digest = keccak256(abi.encodePacked(
            "\x19\x01",
            registry.getDomainSeparator(),
            structHash
        ));
        
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(teePrivateKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        // 5. Submit
        vm.prank(tee);
        registry.submitAttestation(
            user,
            "test-topic",
            score,
            nonce,
            deadline,
            signature
        );
        
        IRTFMSovereign.StakeInfo memory stake = registry.getStakeDetails(user, "test-topic");
        uint256 amount = stake.amount;
        IRTFMSovereign.State status = stake.state;
        assertEq(uint8(status), uint8(IRTFMSovereign.State.Released));
    }

    function test_DoubleStakeRevert() public {
        vm.startPrank(user);
        registry.stakeForChallenge{value: STAKE_AMOUNT}("test-topic");
        
        // Should fail
        vm.expectRevert(); // Simplified revert check
        registry.stakeForChallenge{value: STAKE_AMOUNT}("test-topic");
        vm.stopPrank();
    }
}
