import { ethers } from 'hardhat';
import { deploy, DeploymentConfig } from './deployment/orchestrator';

async function main() {
  console.log('🚀 Starting Smart Contract Deployment with Chunking System\n');

  if (!process.env.PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY environment variable is required');
  }

  const networkName = process.env.NETWORK || 'sepolia';
  const network = networkName === 'sepolia' ? {
    name: 'sepolia',
    chainId: 11155111,
    rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
    blockExplorer: 'https://sepolia.etherscan.io'
  } : networkName === 'mainnet' ? {
    name: 'mainnet',
    chainId: 1,
    rpcUrl: process.env.MAINNET_RPC_URL || 'https://eth.llamarpc.com',
    blockExplorer: 'https://etherscan.io'
  } : {
    name: 'localhost',
    chainId: 31337,
    rpcUrl: 'http://localhost:8545'
  };

  const config: DeploymentConfig = {
    network,
    privateKey: process.env.PRIVATE_KEY,
    teeSignerAddress: process.env.TEE_SIGNER_ADDRESS || '',
    autoVerify: process.env.AUTO_VERIFY === 'true',
    etherscanApiKey: process.env.ETHERSCAN_API_KEY,
    gasPrice: process.env.GAS_PRICE,
    gasLimit: process.env.GAS_LIMIT ? parseInt(process.env.GAS_LIMIT) : undefined
  };

  try {
    await deploy(config);
  } catch (error) {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log('\n✅ Deployment process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
