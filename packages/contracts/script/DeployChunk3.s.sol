// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/SkillStaking.sol";
import "../src/SkillAttestation.sol";

contract DeployChunk3 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployerAddress = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy Attestation Contract
        // Ideally, TEE signer is separate, but for initial deployment we can use deployer as TEE signer
        // or a specific address if known.
        address teeSigner = deployerAddress; 
        SkillAttestation attestation = new SkillAttestation(teeSigner);
        console.log("SkillAttestation deployed at:", address(attestation));

        // Deploy Staking Contract
        SkillStaking staking = new SkillStaking(teeSigner);
        console.log("SkillStaking deployed at:", address(staking));

        vm.stopBroadcast();
    }
}
