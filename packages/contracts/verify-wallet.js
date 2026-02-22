const { ethers } = require('ethers');
const privateKey = '0x14f2045df205ff5ea676c1b8d0c1af01d193b455ea0201658fbf1ca5fc0eb2a0';
const wallet = new ethers.Wallet(privateKey);
const provider = new ethers.JsonRpcProvider('https://rpc.ankr.com/eth_sepolia');

console.log(`Address: ${wallet.address}`);

async function checkBalance() {
  try {
    const balance = await provider.getBalance(wallet.address);
    console.log(`Balance: ${ethers.formatEther(balance)} ETH`);
    
    if (balance < ethers.parseEther('0.3')) {
      console.warn('⚠️ WARNING: Balance is less than 0.3 ETH. Deployment might fail.');
    } else {
      console.log('✅ Balance sufficient for deployment.');
    }
  } catch (error) {
    console.error('Error checking balance:', error.message);
  }
}

checkBalance();
