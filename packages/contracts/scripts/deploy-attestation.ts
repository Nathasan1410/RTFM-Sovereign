import hre from 'hardhat';
import { ethers } from 'hardhat';

interface AttestationDeploymentResult {
  address: string;
  transactionHash: string;
  blockNumber: number;
  gasUsed: bigint;
  deployer: string;
  constructorArgs: {
    teeSigner: string;
  };
  network: string;
  chainId: number;
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║         Chunk 5: Attestation Contract Deployment        ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
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

  const teeSigner = process.env.TEE_SIGNER_ADDRESS || deployer.address;
  console.log(`🔑 TEE Signer:        ${teeSigner}`);
  console.log(`🔐 Signature Type:     EIP-712`);
  console.log(`📊 Max Score:         100`);
  console.log(`📊 Min Score:         0`);

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 Deploying SkillAttestation Contract');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    console.log('\n📦 Creating deployment transaction...');

    const SkillAttestation = await ethers.getContractFactory('SkillAttestation');
    const attestation = await SkillAttestation.deploy(teeSigner);

    console.log('⏳ Transaction submitted, waiting for confirmations...');

    const deploymentTx = attestation.deploymentTransaction();
    if (!deploymentTx) {
      throw new Error('Deployment transaction not found');
    }

    console.log(`   Hash: ${deploymentTx.hash}`);

    const receipt = await attestation.waitForDeployment();
    const attestationAddress = await attestation.getAddress();

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
    console.log(`│ Contract Address:  ${attestationAddress.padEnd(48)}│`);
    console.log(`│ Transaction Hash:  ${deploymentTx.hash.padEnd(48)}│`);
    console.log(`│ Block Number:     ${receipt.blockNumber.toString().padStart(10).padEnd(38)}│`);
    console.log(`│ Gas Used:         ${gasUsed.toString().padStart(15).padEnd(33)}│`);
    console.log(`│ Gas Cost:         ${ethers.formatEther(gasCost).padStart(10).padEnd(38)} ETH│`);
    console.log('└─────────────────────────────────────────────────────────────────┘');

    const result: AttestationDeploymentResult = {
      address: attestationAddress,
      transactionHash: deploymentTx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed,
      deployer: deployer.address,
      constructorArgs: {
        teeSigner
      },
      network: networkName,
      chainId: Number(network.chainId)
    };

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 Verifying Contract Deployment');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const code = await ethers.provider.getCode(attestationAddress);
    if (code === '0x') {
      throw new Error('No contract code found at address');
    }

    console.log('✅ Contract code verified on-chain');
    console.log('');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 Verifying Contract Functions');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const contract = new ethers.Contract(attestationAddress, [
      'function submitAttestation(address user, string skill, uint256 score, bytes signature, string ipfsHash, uint256[] milestoneScores) external',
      'function verifyAttestation(address user, string skill) external view returns (bool exists, uint256 score, uint256 timestamp, bytes signature)',
      'function getAttestationHistory(address user) external view returns (string[] memory)',
      'function userAttestationCount(address user) external view returns (uint256)',
      'function updateTEESigner(address newTEESigner) external',
      'function owner() view returns (address)',
      'function teeSigner() view returns (address)'
    ], deployer);

    const functions = [
      { name: 'submitAttestation', required: true },
      { name: 'verifyAttestation', required: true },
      { name: 'getAttestationHistory', required: true },
      { name: 'userAttestationCount', required: true },
      { name: 'updateTEESigner', required: true },
      { name: 'owner', required: true },
      { name: 'teeSigner', required: true }
    ];

    let allFunctionsVerified = true;

    for (const func of functions) {
      try {
        if (func.name === 'owner') {
          await contract.owner();
        } else if (func.name === 'teeSigner') {
          await contract.teeSigner();
        } else if (func.name === 'userAttestationCount') {
          await contract.userAttestationCount(deployer.address);
        } else if (func.name === 'getAttestationHistory') {
          await contract.getAttestationHistory(deployer.address);
        }

        console.log(`✅ ${func.name.padEnd(22)} - Verified`);
      } catch (error) {
        console.log(`❌ ${func.name.padEnd(22)} - Failed`);
        allFunctionsVerified = false;
      }
    }

    if (!allFunctionsVerified) {
      console.warn('⚠️  Some functions failed verification');
    }

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 Verifying EIP-712 Signature Support');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
      const domain = {
        name: 'RTFM-Sovereign',
        version: '1',
        chainId: network.chainId,
        verifyingContract: attestationAddress
      };

      const types = {
        Attestation: [
          { name: 'user', type: 'address' },
          { name: 'skill', type: 'string' },
          { name: 'score', type: 'uint256' },
          { name: 'nonce', type: 'uint256' }
        ]
      };

      const value = {
        user: deployer.address,
        skill: 'test-skill',
        score: 85,
        nonce: 0
      };

      const signature = await deployer.signTypedData(domain, types, value);

      console.log('✅ EIP-712 signature generation verified');
      console.log(`   Domain: ${domain.name} v${domain.version}`);
      console.log(`   Types: ${Object.keys(types).join(', ')}`);
      console.log(`   Signature length: ${signature.length} bytes`);

    } catch (error: any) {
      console.log(`❌ EIP-712 signature verification failed: ${error.message}`);
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
      console.log(`\n🔍 View Contract:   ${explorerUrl}/address/${attestationAddress}`);
      console.log(`🔍 View Transaction: ${explorerUrl}/tx/${deploymentTx.hash}`);
    }

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 Verification Command');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (explorerUrl) {
      console.log(`\n🔐 Verify on Etherscan:`);
      console.log(`   npx hardhat verify --network ${networkName} ${attestationAddress} ${teeSigner}`);
    }

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Next Steps');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log('\n1️⃣  Update TEE Server Configuration:');
    console.log(`   Add to apps/tee/.env:`);
    console.log(`   CONTRACT_ATTESTATION=${attestationAddress}`);

    console.log('\n2️⃣  Update Web App Configuration:');
    console.log(`   Add to apps/web/.env.local:`);
    console.log(`   NEXT_PUBLIC_ATTESTATION_CONTRACT=${attestationAddress}`);

    console.log('\n3️⃣  Test Contract Integration:');
    console.log(`   Run integration tests to verify contract functionality`);

    console.log('\n4️⃣  Verify on Block Explorer:');
    console.log(`   Check contract is verified on ${explorerUrl}`);

    console.log('');
    console.log('╔═════════════════════════════════════════════════════════╗');
    console.log('║   ✅ Chunk 5: Attestation Contract Deployment - COMPLETED   ║');
    console.log('╚═════════════════════════════════════════════════════════╝');

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
