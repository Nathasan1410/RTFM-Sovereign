const { Wallet } = require('ethers');

const wallet = Wallet.createRandom();

console.log('=== DEVELOPMENT WALLET GENERATED ===');
console.log('');
console.log('IMPORTANT: Save this information securely!');
console.log('This wallet will be used for deploying contracts on Sepolia testnet.');
console.log('');
console.log('Address:', wallet.address);
console.log('Private Key:', wallet.privateKey);
console.log('Mnemonic:', wallet.mnemonic.phrase);
console.log('');
console.log('=== SECURITY CHECKLIST ===');
console.log('1. Copy the private key to packages/contracts/.env as DEPLOYER_KEY');
console.log('2. Store the mnemonic phrase securely (password manager or paper wallet)');
console.log('3. Do not share this information with anyone');
console.log('4. Do not commit this information to git');
console.log('');
