// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/RTFMVerifiableRegistry.sol";
import "../src/RTFMFaucet.sol";

contract DeployRegistry is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);

        RTFMVerifiableRegistry registry = new RTFMVerifiableRegistry();
        console.log("Registry deployed at:", address(registry));

        RTFMFaucet faucet = new RTFMFaucet(deployer);
        console.log("Faucet deployed at:", address(faucet));

        vm.stopBroadcast();
    }
}
