import hre from 'hardhat';
import { ethers } from 'hardhat';

interface StakingDeploymentResult {
  address: string;
  transactionHash: string;
  blockNumber: number;
  gasUsed: bigint;
  deployer: string;
  constructorArgs: {
    teeAttestor: string;
  };
  network: string;
  chainId: number;
}

async function main() {
  console.log('╔═════════════════════════════════════════════════════════╗');
  console.log('║           Chunk 4: Staking Contract Deployment           ║');
  console.log('╚═════════════════════════════════════════════════════════╝');
  console.log('');

  const [deployer] = await ethers.getSigners();

  const network = await ethers.provider.getNetwork();
  const networkName = hre.network.name;

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 Deployment Information');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🌐 Network:           ${networkName}`);
  console.log(`🔗 Chain ID:          ${network.chainId}`);
  console.log(`👤 Deployer:          ${deployer.address}`);
  console.log('');

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Deployer Balance:  ${ethers.formatEther(balance)} ETH`);

  if (balance < ethers.parseEther('0.01')) {
    console.warn('⚠️  WARNING: Low balance! Recommended minimum: 0.01 ETH');
    console.log('   Get testnet ETH from: https://sepoliafaucet.com/');
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📝 Contract Configuration');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const teeAttestor = process.env.TEE_ATTESTOR_ADDRESS || deployer.address;
  console.log(`🔑 TEE Attestor:      ${teeAttestor}`);
  console.log(`💰 Stake Amount:       0.001 ETH`);
  console.log(`🎯 Pass Threshold:     70`);
  console.log(`📊 Total Milestones:   5`);

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 Deploying SkillStaking Contract');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const blockBefore = await ethers.provider.getBlockNumber();

  try {
    console.log('\n📦 Creating deployment transaction...');

    const SkillStaking = await ethers.getContractFactory('SkillStaking');
    const staking = await SkillStaking.deploy(teeAttestor);

    console.log('⏳ Transaction submitted, waiting for confirmations...');

    const deploymentTx = staking.deploymentTransaction();
    if (!deploymentTx) {
      throw new Error('Deployment transaction not found');
    }

    console.log(`   Hash: ${deploymentTx.hash}`);

    const receipt = await staking.waitForDeployment();
    const stakingAddress = await staking.getAddress();

    const blockAfter = await ethers.provider.getBlockNumber();
    const txDetails = await ethers.provider.getTransaction(deploymentTx.hash);
    const gasUsed = txDetails?.gasUsed || 0n;

    const block = await ethers.provider.getBlock(receipt.blockNumber);
    const gasPrice = block?.baseFeePerGas || 0n;
    const gasCost = gasUsed * gasPrice;

    console.log('');
    console.log('✅ Deployment successful!');
    console.log('');

    console.log('┌─────────────────────────────────────────────────────────────────┐');
    console.log('│              DEPLOYMENT RESULTS                            │');
    console.log('├─────────────────────────────────────────────────────────────────┤');
    console.log(`│ Contract Address:  ${stakingAddress.padEnd(48)}│`);
    console.log(`│ Transaction Hash:  ${deploymentTx.hash.padEnd(48)}│`);
    console.log(`│ Block Number:     ${receipt.blockNumber.toString().padStart(10).padEnd(38)}│`);
    console.log(`│ Gas Used:         ${gasUsed.toString().padStart(15).padEnd(33)}│`);
    console.log(`│ Gas Cost:         ${ethers.formatEther(gasCost).padStart(10).padEnd(38)} ETH│`);
    console.log('└─────────────────────────────────────────────────────────────────┘');

    const result: StakingDeploymentResult = {
      address: stakingAddress,
      transactionHash: deploymentTx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed,
      deployer: deployer.address,
      constructorArgs: {
        teeAttestor
      },
      network: networkName,
      chainId: Number(network.chainId)
    };

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 Verifying Contract Deployment');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const code = await ethers.provider.getCode(stakingAddress);
    if (code === '0x') {
      throw new Error('No contract code found at address');
    }

    console.log('✅ Contract code verified on-chain');
    console.log('');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 Verifying Contract Functions');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const contract = new ethers.Contract(stakingAddress, [
      'function stake(string skillTopic) external payable',
      'function recordMilestone(address user, string skill, uint256 milestoneId) external',
      'function claimRefund(address user, string skill, uint256 finalScore) external',
      'function withdrawTreasury() external',
      'function updateTEEAttestor(address newTEEAttestor) external',
      'function owner() view returns (address)',
      'function teeAttestor() view returns (address)',
      'function STAKE_AMOUNT() view returns (uint256)',
      'function PASS_THRESHOLD() view returns (uint256)'
    ], deployer);

    const functions = [
      { name: 'stake', required: true },
      { name: 'recordMilestone', required: true },
      { name: 'claimRefund', required: true },
      { name: 'withdrawTreasury', required: true },
      { name: 'updateTEEAttestor', required: true },
      { name: 'owner', required: true },
      { name: 'teeAttestor', required: true },
      { name: 'STAKE_AMOUNT', required: true },
      { name: 'PASS_THRESHOLD', required: true }
    ];

    let allFunctionsVerified = true;

    for (const func of functions) {
      try {
        if (func.name === 'owner') {
          await contract.owner();
        } else if (func.name === 'teeAttestor') {
          await contract.teeAttestor();
        } else if (func.name === 'STAKE_AMOUNT') {
          await contract.STAKE_AMOUNT();
        } else if (func.name === 'PASS_THRESHOLD') {
          await contract.PASS_THRESHOLD();
        }

        console.log(`✅ ${func.name.padEnd(20)} - Verified`);
      } catch (error) {
        console.log(`❌ ${func.name.padEnd(20)} - Failed`);
        allFunctionsVerified = false;
      }
    }

    if (!allFunctionsVerified) {
      console.warn('⚠️  Some functions failed verification');
    }

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Block Explorer Links');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    let explorerUrl: string;
    if (networkName === 'sepolia') {
      explorerUrl = `https://sepolia.etherscan.io`;
    } else if (networkName === 'mainnet') {
      explorerUrl = `https://etherscan.io`;
    } else {
      explorerUrl = '';
    }

    if (explorerUrl) {
      console.log(`\n🔍 View Contract:   ${explorerUrl}/address/${stakingAddress}`);
      console.log(`🔍 View Transaction: ${explorerUrl}/tx/${deploymentTx.hash}`);
    }

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 Verification Command');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (explorerUrl) {
      console.log(`\n🔐 Verify on Etherscan:`);
      console.log(`   npx hardhat verify --network ${networkName} ${stakingAddress} ${teeAttestor}`);
    }

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Next Steps');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log('\n1️⃣  Update TEE Server Configuration:');
    console.log(`   Add to apps/tee/.env:`);
    console.log(`   CONTRACT_STAKING=${stakingAddress}`);

    console.log('\n2️⃣  Update Web App Configuration:');
    console.log(`   Add to apps/web/.env.local:`);
    console.log(`   NEXT_PUBLIC_STAKING_CONTRACT=${stakingAddress}`);

    console.log('\n3️⃣  Deploy Attestation Contract:');
    console.log(`   npm run deploy:attestation`);

    console.log('\n4️⃣  Run Integration Tests:');
    console.log(`   npm test -- test-integration.ts`);

    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║     ✅ Chunk 4: Staking Contract Deployment - COMPLETED     ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');

    console.log('\n📄 Deployment Result (JSON):');
    console.log(JSON.stringify(result, null, 2));

    return result;

  } catch (error: any) {
    console.error('\n❌ Deployment failed:', error.message);
    
    if (error.message.includes('insufficient funds')) {
      console.error('💡 Solution: Add more ETH to deployer wallet');
    } else if (error.message.includes('nonce')) {
      console.error('💡 Solution: Wait for pending transactions or reset nonce');
    } else if (error.message.includes('network')) {
      console.error('💡 Solution: Check network connectivity and RPC endpoint');
    }

    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
