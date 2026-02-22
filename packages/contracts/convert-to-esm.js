import { writeFileSync } from 'fs';

const configContent = `import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";
dotenv.config();

const config = {
  solidity: "0.8.19",
  networks: {
    sepolia: {
      url: "https://rpc.ankr.com/eth_sepolia",
      accounts: ["0x14f2045df205ff5ea676c1b8d0c1af01d193b455ea0201658fbf1ca5fc0eb2a0"]
    }
  }
};

export default config;`;

writeFileSync('hardhat.config.js', configContent);
console.log('hardhat.config.js updated to ESM');

const deployContent = `import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const RTFMVerifiableRegistry = await hre.ethers.getContractFactory("RTFMVerifiableRegistry");
  const pendingTEE = deployer.address;
  const minStake = hre.ethers.parseEther("0.001");
  
  console.log("Deploying RTFMVerifiableRegistry...");
  const registry = await RTFMVerifiableRegistry.deploy(pendingTEE, minStake);
  await registry.waitForDeployment();
  console.log("RTFMVerifiableRegistry deployed to:", await registry.getAddress());
  
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

writeFileSync('scripts/deploy.js', deployContent);
console.log('scripts/deploy.js updated to ESM');
