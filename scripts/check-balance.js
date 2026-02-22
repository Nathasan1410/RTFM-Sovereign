const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', 'packages', 'contracts', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) envVars[key.trim()] = value.trim();
});

const SEPOLIA_RPC_URL = envVars.SEPOLIA_PUBLIC_RPC_2 || 'https://eth-sepolia.publicnode.com';
const DEPLOYER_KEY = envVars.DEPLOYER_KEY;

if (!DEPLOYER_KEY) {
  console.error('Error: DEPLOYER_KEY not found in packages/contracts/.env');
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
const wallet = new ethers.Wallet(DEPLOYER_KEY, provider);

async function checkBalance() {
  try {
    console.log('=== WALLET BALANCE CHECK ===');
    console.log('');

    const balance = await provider.getBalance(wallet.address);
    const balanceInEth = ethers.formatEther(balance);

    console.log('Address:', wallet.address);
    console.log('Balance:', `${balanceInEth} ETH`);
    console.log('Network:', 'Sepolia Testnet');
    console.log('');

    if (balance === 0n) {
      console.log('⚠️  WARNING: Wallet has 0 ETH. You need to fund it using a faucet.');
      console.log('Recommended faucets:');
      console.log('  - Alchemy: https://sepoliafaucet.com');
      console.log('  - Infura: https://www.infura.io/faucet/sepolia');
      console.log('  - PoW: https://sepolia-faucet.pk910.de/');
    } else {
      console.log('✅ Wallet is funded and ready for deployment.');
    }

    console.log('');
    console.log('Etherscan:', `https://sepolia.etherscan.io/address/${wallet.address}`);
  } catch (error) {
    console.error('Error checking balance:', error.message);
    process.exit(1);
  }
}

checkBalance();
