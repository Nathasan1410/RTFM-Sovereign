import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  if (balance < hre.ethers.parseEther("0.01")) {
    console.warn("WARNING: Low balance! Please ensure you have at least 0.01 ETH for deployment and verification.");
  }

  const deployerAddress = deployer.address;

  console.log("\n1. Deploying SkillAttestation...");
  const SkillAttestation = await hre.ethers.getContractFactory("SkillAttestation");
  
  const attestation = await SkillAttestation.deploy(deployerAddress);
  await attestation.waitForDeployment();
  
  const attestationAddress = await attestation.getAddress();
  console.log("✓ SkillAttestation deployed to:", attestationAddress);

  console.log("\n2. Deploying SkillStaking...");
  const SkillStaking = await hre.ethers.getContractFactory("SkillStaking");
  
  const staking = await SkillStaking.deploy(deployerAddress);
  await staking.waitForDeployment();
  
  const stakingAddress = await staking.getAddress();
  console.log("✓ SkillStaking deployed to:", stakingAddress);

  console.log("\n3. Linking contracts...");
  const tx = await attestation.setStakingContract(stakingAddress);
  await tx.wait();
  console.log("✓ Contracts linked");

  const deploymentInfo = {
    network: "sepolia",
    chainId: 11155111,
    contracts: {
      SkillAttestation: {
        address: attestationAddress,
        abi: "artifacts/contracts/SkillAttestation.sol/SkillAttestation.json"
      },
      SkillStaking: {
        address: stakingAddress,
        abi: "artifacts/contracts/SkillStaking.sol/SkillStaking.json"
      }
    },
    deployer: deployerAddress,
    timestamp: new Date().toISOString(),
    teeSigner: deployerAddress
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  fs.writeFileSync(
    path.join(deploymentsDir, "sepolia.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("\n✅ Deployment saved to deployments/sepolia.json");

  console.log("\n📋 NEXT STEPS:");
  console.log("1. Verify contracts on Etherscan:");
  console.log(`   npx hardhat verify --network sepolia ${attestationAddress} ${deployerAddress}`);
  console.log(`   npx hardhat verify --network sepolia ${stakingAddress} ${deployerAddress}`);
  console.log("\n2. Update apps/tee/.env with:");
  console.log(`   CONTRACT_ATTESTATION=${attestationAddress}`);
  console.log(`   CONTRACT_STAKING=${stakingAddress}`);
  console.log("\n3. Update apps/web/.env.local with:");
  console.log(`   NEXT_PUBLIC_ATTESTATION_CONTRACT=${attestationAddress}`);
  console.log(`   NEXT_PUBLIC_STAKING_CONTRACT=${stakingAddress}`);
  console.log(`   NEXT_PUBLIC_CHAIN_ID=11155111`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
