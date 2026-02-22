// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "forge-std/Script.sol";
import "../src/RTFMVerifiableRegistry.sol";

contract DeployRegistry is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_KEY");
        
        vm.startBroadcast(deployerPrivateKey);

        RTFMVerifiableRegistry registry = new RTFMVerifiableRegistry();
        
        console.log("Registry deployed at:", address(registry));

        vm.stopBroadcast();
    }
}
