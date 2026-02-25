#!/usr/bin/env node

/**
 * Production Environment Verification Script
 */

const { config } = require('dotenv');
const axios = require('axios');

config({ path: '.env' });

console.log('\n🔍 Production Environment Verification\n');
console.log('='.repeat(60));

const required = [
  'RPC_URL', 'CHAIN_ID', 'CONTRACT_ATTESTATION', 'CONTRACT_STAKING',
  'TEE_PRIVATE_KEY', 'WALLET_PRIVATE_KEY', 'GROQ_API_KEY', 'BRAVE_API_KEY',
  'PINATA_API_KEY', 'PINATA_SECRET_API_KEY', 'PINATA_JWT'
];

const optional = ['CEREBRAS_API_KEY', 'HYPERBOLIC_API_KEY', 'REDIS_URL', 'SENTRY_DSN', 'PORT', 'NODE_ENV', 'SGX_ENABLED', 'USE_MOCK_TEE'];

function maskKey(key) {
  if (!key || key.length < 10) return '***';
  const stars = '*'.repeat(Math.max(0, key.length - 10));
  return key.substring(0, 6) + stars + key.substring(key.length - 4);
}

console.log('\n📋 Required Environment Variables:\n');
let allSet = true;

for (const varName of required) {
  const value = process.env[varName];
  const status = value ? '✅' : '❌';
  const masked = value ? maskKey(value) : 'NOT SET';
  console.log(`${status} ${varName.padEnd(30)} ${masked}`);
  if (!value) allSet = false;
}

console.log('\n📋 Optional Environment Variables:\n');

for (const varName of optional) {
  const value = process.env[varName];
  const status = value ? '✅' : '⭕';
  const masked = value ? maskKey(value) : 'NOT SET';
  console.log(`${status} ${varName.padEnd(30)} ${masked}`);
}

console.log('\n🌐 External Service Verification:\n');

if (process.env.TEE_PRIVATE_KEY) {
  const { ethers } = require('ethers');
  const wallet = new ethers.Wallet(process.env.TEE_PRIVATE_KEY);
  console.log(`📧 TEE Wallet Address: ${wallet.address}`);
  
  console.log('🔎 Checking EigenAI Grant...');
  axios.get(`https://determinal-api.eigenarcade.com/checkGrant?address=${wallet.address}`)
    .then(r => {
      if (r.data.hasGrant) {
        console.log(`✅ EigenAI Grant: ${r.data.tokenCount.toLocaleString()} tokens available`);
      } else {
        console.log('⚠️  EigenAI Grant: No grant found (will use fallback providers)');
      }
    })
    .catch(() => console.log('❌ Failed to check EigenAI grant'));
}

console.log('\n📊 Summary:\n');
console.log('='.repeat(60));

if (allSet) {
  console.log('✅ All required environment variables are set!');
} else {
  console.log('❌ Some required environment variables are missing!');
}

console.log('\n📝 Configuration Status:\n');
console.log(`   Node Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`   Port: ${process.env.PORT || '3000'}`);
console.log(`   SGX Enabled: ${process.env.SGX_ENABLED === 'true' ? 'Yes' : 'No'}`);
console.log(`   Mock TEE: ${process.env.USE_MOCK_TEE === 'true' ? 'Yes' : 'No'}`);

console.log('\n💡 Next Steps:\n');

if (allSet) {
  console.log('   1. Build Docker image: docker build -f Dockerfile.tee -t tee-service .');
  console.log('   2. Run container: docker run --env-file .env -p 3000:3000 tee-service');
  console.log('   3. Verify health: curl http://localhost:3000/health');
} else {
  console.log('   1. Set all required environment variables');
  console.log('   2. Copy .env.production to .env');
  console.log('   3. Run this script again to verify');
}

console.log('\n' + '='.repeat(60) + '\n');

process.exit(allSet ? 0 : 1);
