import hre from 'hardhat';
import { ethers } from 'hardhat';
import fs from 'fs/promises';
import path from 'path';

const NETWORK = 'sepolia';
const CONFIRMATIONS = 6;

interface DeploymentData {
  network: string;
  chainId: string;
  timestamp: number;
  deployer: string;
  contracts: {
    SkillStaking: string;
    SkillAttestation: string;
  };
  transactions: {
    SkillStaking: string;
    SkillAttestation: string;
  };
  gasUsage: {
    SkillStaking: string;
    SkillAttestation: string;
    total: string;
  };
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║           Chunk 3: Testnet Deployment                      ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');

  console.log(`🌐 Network: ${NETWORK}`);
  console.log(`⏳ Confirmations: ${CONFIRMATIONS}`);
  console.log('');

  const [deployer] = await ethers.getSigners();
  console.log(`👤 Deployer: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Deployer Balance: ${ethers.formatEther(balance)} ETH`);

  if (balance < ethers.parseEther('0.01')) {
    console.warn('⚠️  WARNING: Low balance! Recommended minimum: 0.01 ETH');
  }

  console.log('');

  const deploymentData: DeploymentData = {
    network: NETWORK,
    chainId: '',
    timestamp: Date.now(),
    deployer: deployer.address,
    contracts: {
      SkillStaking: '',
      SkillAttestation: ''
    },
    transactions: {
      SkillStaking: '',
      SkillAttestation: ''
    },
    gasUsage: {
      SkillStaking: '0',
      SkillAttestation: '0',
      total: '0'
    }
  };

  const network = await ethers.provider.getNetwork();
  deploymentData.chainId = network.chainId.toString();

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1️⃣  Deploying SkillStaking Contract');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    const SkillStaking = await ethers.getContractFactory('SkillStaking');
    
    console.log('\n📝 Constructor Arguments:');
    console.log(`   - TEE Attestor: ${deployer.address}`);
    console.log(`   - Stake Amount: 0.001 ETH`);
    console.log(`   - Pass Threshold: 70`);
    console.log(`   - Milestones: 5`);

    const staking = await SkillStaking.deploy(deployer.address);
    
    console.log('\n⏳ Waiting for confirmations...');
    const stakingReceipt = await staking.waitForDeployment();
    const stakingAddress = await staking.getAddress();
    
    const stakingTx = await ethers.provider.getTransaction(stakingReceipt.deploymentTransaction()!.hash);
    const stakingGasUsed = stakingTx!.gasUsed || 0n;
    
    deploymentData.contracts.SkillStaking = stakingAddress;
    deploymentData.transactions.SkillStaking = stakingReceipt.deploymentTransaction()!.hash;
    deploymentData.gasUsage.SkillStaking = stakingGasUsed.toString();

    console.log(`\n✅ SkillStaking deployed successfully!`);
    console.log(`   Address:   ${stakingAddress}`);
    console.log(`   Tx Hash:    ${deploymentData.transactions.SkillStaking}`);
    console.log(`   Gas Used:   ${stakingGasUsed.toString()}`);
    console.log(`   Block:      ${stakingReceipt.blockNumber}`);

  } catch (error: any) {
    console.error(`\n❌ SkillStaking deployment failed: ${error.message}`);
    throw error;
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('2️⃣  Deploying SkillAttestation Contract');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    const SkillAttestation = await ethers.getContractFactory('SkillAttestation');
    
    console.log('\n📝 Constructor Arguments:');
    console.log(`   - TEE Signer: ${deployer.address}`);

    const attestation = await SkillAttestation.deploy(deployer.address);
    
    console.log('\n⏳ Waiting for confirmations...');
    const attestationReceipt = await attestation.waitForDeployment();
    const attestationAddress = await attestation.getAddress();
    
    const attestationTx = await ethers.provider.getTransaction(attestationReceipt.deploymentTransaction()!.hash);
    const attestationGasUsed = attestationTx!.gasUsed || 0n;
    
    deploymentData.contracts.SkillAttestation = attestationAddress;
    deploymentData.transactions.SkillAttestation = attestationReceipt.deploymentTransaction()!.hash;
    deploymentData.gasUsage.SkillAttestation = attestationGasUsed.toString();

    const totalGas = stakingGasUsed + attestationGasUsed;
    deploymentData.gasUsage.total = totalGas.toString();

    console.log(`\n✅ SkillAttestation deployed successfully!`);
    console.log(`   Address:   ${attestationAddress}`);
    console.log(`   Tx Hash:    ${deploymentData.transactions.SkillAttestation}`);
    console.log(`   Gas Used:   ${attestationGasUsed.toString()}`);
    console.log(`   Block:      ${attestationReceipt.blockNumber}`);

  } catch (error: any) {
    console.error(`\n❌ SkillAttestation deployment failed: ${error.message}`);
    throw error;
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('3️⃣  Deployment Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  console.log('\n┌─────────────────────────────────────────────────────────────────┐');
  console.log('│                  DEPLOYMENT SUMMARY                        │');
  console.log('├─────────────────────────────────────────────────────────────────┤');
  console.log(`│ Network:           ${NETWORK.padEnd(48)}│`);
  console.log(`│ Chain ID:          ${deploymentData.chainId.padEnd(48)}│`);
  console.log(`│ Deployer:          ${deployer.address.padEnd(48)}│`);
  console.log(`│ Timestamp:         ${new Date(deploymentData.timestamp).toISOString().padEnd(48)}│`);
  console.log('└─────────────────────────────────────────────────────────────────┘');

  console.log('\n┌─────────────────────────────────────────────────────────────────┐');
  console.log('│                  CONTRACT ADDRESSES                       │');
  console.log('├─────────────────────────────────────────────────────────────────┤');
  console.log(`│ SkillStaking:      ${deploymentData.contracts.SkillStaking.padEnd(48)}│`);
  console.log(`│ SkillAttestation: ${deploymentData.contracts.SkillAttestation.padEnd(48)}│`);
  console.log('└─────────────────────────────────────────────────────────────────┘');

  console.log('\n┌─────────────────────────────────────────────────────────────────┐');
  console.log('│                  TRANSACTION HASHES                        │');
  console.log('├─────────────────────────────────────────────────────────────────┤');
  console.log(`│ SkillStaking:      ${deploymentData.transactions.SkillStaking.substring(0, 48)}│`);
  console.log(`│                   ${deploymentData.transactions.SkillStaking.substring(48).padEnd(48)}│`);
  console.log(`│ SkillAttestation: ${deploymentData.transactions.SkillAttestation.substring(0, 48)}│`);
  console.log(`│                   ${deploymentData.transactions.SkillAttestation.substring(48).padEnd(48)}│`);
  console.log('└─────────────────────────────────────────────────────────────────┘');

  console.log('\n┌─────────────────────────────────────────────────────────────────┐');
  console.log('│                  GAS USAGE                                │');
  console.log('├─────────────────────────────────────────────────────────────────┤');
  console.log(`│ SkillStaking:      ${deploymentData.gasUsage.SkillStaking.padStart(20).padEnd(28)}│`);
  console.log(`│ SkillAttestation: ${deploymentData.gasUsage.SkillAttestation.padStart(20).padEnd(28)}│`);
  console.log('├─────────────────────────────────────────────────────────────────┤');
  console.log(`│ TOTAL:             ${deploymentData.gasUsage.total.padStart(20).padEnd(28)}│`);
  console.log('└─────────────────────────────────────────────────────────────────┘');

  const block = await ethers.provider.getBlock('latest');
  const gasPrice = block?.baseFeePerGas || 0n;
  const totalCost = (totalGas * gasPrice);
  console.log(`\n💰 Estimated Cost: ${ethers.formatEther(totalCost)} ETH`);

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('4️⃣  Saving Deployment Information');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  await fs.mkdir(deploymentsDir, { recursive: true });

  const outputPath = path.join(deploymentsDir, `${NETWORK}.json`);
  await fs.writeFile(outputPath, JSON.stringify(deploymentData, null, 2));

  console.log(`\n✅ Deployment info saved to: ${outputPath}`);

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('5️⃣  Verification Links');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  console.log('\n🔍 View on Sepolia Block Explorer:');
  console.log(`   SkillStaking:      https://sepolia.etherscan.io/address/${deploymentData.contracts.SkillStaking}`);
  console.log(`   SkillAttestation: https://sepolia.etherscan.io/address/${deploymentData.contracts.SkillAttestation}`);
  console.log('');
  console.log(`   SkillStaking Tx:   https://sepolia.etherscan.io/tx/${deploymentData.transactions.SkillStaking}`);
  console.log(`   SkillAttestation Tx: https://sepolia.etherscan.io/tx/${deploymentData.transactions.SkillAttestation}`);

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('6️⃣  Next Steps');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  console.log('\n📋 Manual steps required:');
  console.log('   1. Verify contracts on Etherscan:');
  console.log(`      npx hardhat verify --network ${NETWORK} ${deploymentData.contracts.SkillStaking} ${deployer.address}`);
  console.log(`      npx hardhat verify --network ${NETWORK} ${deploymentData.contracts.SkillAttestation} ${deployer.address}`);
  console.log('');
  console.log('   2. Update apps/tee/.env:');
  console.log(`      CONTRACT_STAKING=${deploymentData.contracts.SkillStaking}`);
  console.log(`      CONTRACT_ATTESTATION=${deploymentData.contracts.SkillAttestation}`);
  console.log('');
  console.log('   3. Update apps/web/.env.local:');
  console.log(`      NEXT_PUBLIC_CHAIN_ID=11155111`);
  console.log(`      NEXT_PUBLIC_STAKING_CONTRACT=${deploymentData.contracts.SkillStaking}`);
  console.log(`      NEXT_PUBLIC_ATTESTATION_CONTRACT=${deploymentData.contracts.SkillAttestation}`);
  console.log('');
  console.log('   4. Restart TEE server to pick up new addresses');
  console.log('');
  console.log('   5. Run integration tests to verify functionality');

  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     ✅ Chunk 3: Testnet Deployment - COMPLETED              ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
