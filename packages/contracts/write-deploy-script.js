const fs = require('fs');
const content = `const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy RTFMVerifiableRegistry
  const RTFMVerifiableRegistry = await hre.ethers.getContractFactory("RTFMVerifiableRegistry");
  
  // Args: pendingTEE (deployer as placeholder), minStake (0.001 ETH)
  const pendingTEE = deployer.address;
  const minStake = hre.ethers.parseEther("0.001");
  
  console.log("Deploying RTFMVerifiableRegistry...");
  const registry = await RTFMVerifiableRegistry.deploy(pendingTEE, minStake);

  await registry.waitForDeployment();

  console.log("RTFMVerifiableRegistry deployed to:", await registry.getAddress());
  
  // Deploy RTFMFaucet
  console.log("Deploying RTFMFaucet...");
  const RTFMFaucet = await hre.ethers.getContractFactory("RTFMFaucet");
  const faucet = await RTFMFaucet.deploy();
  await faucet.waitForDeployment();
  
  console.log("RTFMFaucet deployed to:", await faucet.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});`;

if (!fs.existsSync('scripts')) {
  fs.mkdirSync('scripts');
}
fs.writeFileSync('scripts/deploy.js', content);
console.log('scripts/deploy.js created');
