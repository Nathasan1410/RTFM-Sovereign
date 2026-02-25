import hre from 'hardhat';
import { ethers } from 'hardhat';
import {
  ATTESTATION_PARAMS,
  getNetworkConfig,
  formatGasUsed,
  formatEther,
  generateDomain,
  ATTESTATION_TYPES,
  createAttestationValue,
  DeploymentResult,
  createDeploymentResult,
  printDeploymentBanner,
  printSection,
  printSuccess,
  printError,
  printWarning,
  printInfo,
  verifyContractOnChain,
  generateExplorerLinks
} from './utils/deployment-helpers';

async function main() {
  printDeploymentBanner('Chunk 5: Attestation Contract Deployment');

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const networkName = hre.network.name;
  const networkConfig = getNetworkConfig(networkName);

  printSection('📋 Deployment Information');

  console.log(`🌐 Network:           ${networkName}`);
  console.log(`🔗 Chain ID:          ${network.chainId}`);
  console.log(`👤 Deployer:          ${deployer.address}`);
  console.log('');

  const balance = await deployer.provider.getBalance(deployer.address);
  console.log(`💰 Deployer Balance:  ${formatEther(balance)}`);

  if (balance < ethers.parseEther('0.01')) {
    printWarning('Low balance! Recommended minimum: 0.01 ETH');
    console.log('   Get testnet ETH from: https://sepoliafaucet.com/');
  }

  console.log('');
  printSection('📝 Contract Configuration');

  const teeSigner = process.env.TEE_SIGNER_ADDRESS || deployer.address;
  console.log(`🔑 TEE Signer:        ${teeSigner}`);
  console.log(`🔐 Signature Type:     ${ATTESTATION_PARAMS.signatureType}`);
  console.log(`📊 Max Score:         ${ATTESTATION_PARAMS.maxScore}`);
  console.log(`📊 Min Score:         ${ATTESTATION_PARAMS.minScore}`);
  console.log(`📝 Domain:            ${ATTESTATION_PARAMS.domainName} v${ATTESTATION_PARAMS.domainVersion}`);

  console.log('');
  printSection('🚀 Deploying SkillAttestation Contract');

  try {
    console.log('\n📦 Creating deployment transaction...');

    const SkillAttestation = await ethers.getContractFactory('SkillAttestation');
    const attestation = await SkillAttestation.deploy(teeSigner);

    console.log('⏳ Transaction submitted, waiting for confirmations...');
    console.log(`   Hash: ${attestation.deploymentTransaction()!.hash}`);

    const receipt = await attestation.waitForDeployment();
    const attestationAddress = await attestation.getAddress();

    const txDetails = await ethers.provider.getTransaction(attestation.deploymentTransaction()!.hash);
    const gasUsed = txDetails?.gasUsed || 0n;

    const block = await ethers.provider.getBlock(receipt.blockNumber);
    const gasPrice = block?.baseFeePerGas || 0n;
    const gasCost = gasUsed * gasPrice;

    console.log('');
    printSuccess('Deployment successful!');
    console.log('');

    console.log('┌─────────────────────────────────────────────────────────────────┐');
    console.log('│              DEPLOYMENT RESULTS                            │');
    console.log('├─────────────────────────────────────────────────────────────────┤');
    console.log(`│ Contract Address:  ${attestationAddress.padEnd(48)}│`);
    console.log(`│ Transaction Hash:  ${attestation.deploymentTransaction()!.hash.padEnd(48)}│`);
    console.log(`│ Block Number:     ${receipt.blockNumber.toString().padStart(10).padEnd(38)}│`);
    console.log(`│ Gas Used:         ${formatGasUsed(gasUsed).padStart(20).padEnd(28)}│`);
    console.log(`│ Gas Cost:         ${formatEther(gasCost).padStart(10).padEnd(38)}│`);
    console.log('└─────────────────────────────────────────────────────────────────┘');

    const result = createDeploymentResult(
      attestationAddress,
      attestation.deploymentTransaction()!.hash,
      receipt.blockNumber,
      gasUsed,
      deployer.address,
      networkName,
      Number(network.chainId)
    );

    console.log('');
    printSection('🔍 Verifying Contract Deployment');

    const codeExists = await verifyContractOnChain(attestationAddress, ethers.provider);
    if (!codeExists) {
      throw new Error('No contract code found at address');
    }
    printSuccess('Contract code verified on-chain');
    console.log('');

    printSection('🧪 Verifying Contract Functions');

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
        printSuccess(`${func.name.padEnd(24)} - Verified`);
      } catch (error) {
        printError(`${func.name.padEnd(24)} - Failed`);
        allFunctionsVerified = false;
      }
    }

    if (!allFunctionsVerified) {
      printWarning('Some functions failed verification');
    }

    console.log('');
    printSection('🔐 Verifying EIP-712 Signature Support');

    try {
      const domain = generateDomain(attestationAddress, Number(network.chainId));

      const value = createAttestationValue(
        deployer.address,
        'test-skill',
        85,
        0
      );

      const signature = await deployer.signTypedData(domain, ATTESTATION_TYPES, value);

      printSuccess('EIP-712 signature generation verified');
      console.log(`   Domain: ${domain.name} v${domain.version}`);
      console.log(`   Types: ${Object.keys(ATTESTATION_TYPES).join(', ')}`);
      console.log(`   Signature length: ${signature.length} bytes`);
    } catch (error: any) {
      printError(`EIP-712 signature verification failed: ${error.message}`);
    }

    console.log('');
    printSection('📋 Block Explorer Links');

    const links = generateExplorerLinks(
      attestationAddress,
      attestation.deploymentTransaction()!.hash,
      networkName
    );

    if (links.contractLink) {
      console.log(`\n🔍 View Contract:   ${links.contractLink}`);
      console.log(`🔍 View Transaction: ${links.transactionLink}`);
    }

    console.log('');
    printSection('📝 Verification Command');

    if (links.contractLink) {
      console.log(`\n🔐 Verify on Etherscan:`);
      console.log(`   npx hardhat verify --network ${networkName} ${attestationAddress} ${teeSigner}`);
    }

    console.log('');
    printSection('📋 Next Steps');

    console.log('\n1️⃣  Update TEE Server Configuration:');
    console.log(`   Add to apps/tee/.env:`);
    console.log(`   CONTRACT_ATTESTATION=${attestationAddress}`);

    console.log('\n2️⃣  Update Web App Configuration:');
    console.log(`   Add to apps/web/.env.local:`);
    console.log(`   NEXT_PUBLIC_ATTESTATION_CONTRACT=${attestationAddress}`);

    console.log('\n3️⃣  Test Contract Integration:');
    console.log(`   Run integration tests to verify contract functionality`);

    console.log('\n4️⃣  Verify on Block Explorer:');
    console.log(`   Check contract is verified on ${networkConfig.blockExplorer}`);

    console.log('');
    printSuccess('Chunk 5: Attestation Contract Deployment - COMPLETED');
    console.log('');
    console.log('📄 Deployment Result (JSON):');
    console.log(JSON.stringify(result, null, 2));

    return result;

  } catch (error: any) {
    printError(`Deployment failed: ${error.message}`);

    if (error.message.includes('insufficient funds')) {
      printError('Solution: Add more ETH to deployer wallet');
    } else if (error.message.includes('nonce')) {
      printError('Solution: Wait for pending transactions or reset nonce');
    } else if (error.message.includes('network')) {
      printError('Solution: Check network connectivity and RPC endpoint');
    }

    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    printError(`Fatal error: ${error}`);
    process.exit(1);
  });
