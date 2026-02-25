#!/usr/bin/env node

/**
 * Production Environment Verification Script (Plain JS)
 * 
 * This script verifies that all required environment variables are set
 * and that external services are accessible.
 * 
 * Usage: node verify-production-env.js
 */

const { config } = require('dotenv');
const axios = require('axios');

// Load environment variables FIRST
config({ path: '.env' });

const REQUIRED_VARS = [
  'RPC_URL',
  'CHAIN_ID',
  'CONTRACT_ATTESTATION',
  'CONTRACT_STAKING',
  'TEE_PRIVATE_KEY',
  'WALLET_PRIVATE_KEY',
  'GROQ_API_KEY',
  'BRAVE_API_KEY',
  'PINATA_API_KEY',
  'PINATA_SECRET_API_KEY',
  'PINATA_JWT',
];

const OPTIONAL_VARS = [
  'CEREBRAS_API_KEY',
  'HYPERBOLIC_API_KEY',
  'REDIS_URL',
  'SENTRY_DSN',
  'PORT',
  'NODE_ENV',
  'SGX_ENABLED',
  'USE_MOCK_TEE',
];

function isHexPrivateKey(key) {
  const trimmed = key ? key.trim() : '';
  if (!trimmed || trimmed.length !== 66) return false;
  return trimmed.startsWith('0x') && /^[0-9a-fA-F]{64}$/.test(trimmed);
}

function isEthereumAddress(address) {
  const trimmed = address ? address.trim() : '';
  const debug = process.env.DEBUG_ETH_ADDR === 'true';
  if (debug) {
    console.log('    [isEthereumAddress CALL #' + (++isEthereumAddress.callCount || 1) + ']');
    console.log('      Input:', JSON.stringify(address));
    console.log('      Trimmed:', JSON.stringify(trimmed));
    console.log('      Length:', trimmed?.length);
    console.log('      Starts with 0x:', trimmed?.startsWith('0x'));
    console.log('      Substring(2):', trimmed?.substring(2));
    console.log('      Regex test:', /^[0-9a-fA-F]{40}$/.test(trimmed?.substring(2)));
    console.log('      Result:', trimmed.length === 42 && trimmed.startsWith('0x') && /^[0-9a-fA-F]{40}$/.test(trimmed.substring(2)));
  }
  if (!trimmed || trimmed.length !== 42) return false;
  return trimmed.startsWith('0x') && /^[0-9a-fA-F]{40}$/.test(trimmed);
}
isEthereumAddress.callCount = 0;

function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function maskKey(key, showFirst = 6, showLast = 4) {
  if (key.length < showFirst + showLast) return '***';
  return `${key.substring(0, showFirst)}${'*'.repeat(key.length - showFirst - showLast)}${key.substring(key.length - showLast)}`;
}

async function checkEigenAIGrant(address) {
  try {
    const response = await axios.get(`https://determinal-api.eigenarcade.com/checkGrant?address=${address}`);
    return {
      hasGrant: response.data.hasGrant || false,
      tokenCount: response.data.tokenCount || 0,
    };
  } catch (error) {
    return { hasGrant: false, tokenCount: 0 };
  }
}

async function verifyRpcUrl(url) {
  try {
    const response = await axios.post(url, {
      jsonrpc: '2.0',
      method: 'eth_blockNumber',
      params: [],
      id: 1,
    }, { timeout: 5000 });
    return response.status === 200 && response.data.result !== undefined;
  } catch {
    return false;
  }
}

async function verifyIpfsKeys(apiKey, secretKey) {
  try {
    const auth = Buffer.from(`${apiKey}:${secretKey}`).toString('base64');
    const response = await axios.get('https://api.pinata.cloud/data/testAuthentication', {
      headers: {
        'Authorization': `Bearer ${process.env.PINATA_JWT}`,
      },
      timeout: 5000,
    });
    return response.status === 200;
  } catch {
    return false;
  }
}

function validateVariable(varName, value) {
  if (!value) return false;
  
  switch (varName) {
    case 'TEE_PRIVATE_KEY':
    case 'WALLET_PRIVATE_KEY':
      return isHexPrivateKey(value);
    case 'CONTRACT_ATTESTATION':
    case 'CONTRACT_STAKING':
      return isEthereumAddress(value);
    case 'RPC_URL':
    case 'EIGENAI_API_URL':
    case 'IPFS_GATEWAY':
      return isValidUrl(value);
    case 'CHAIN_ID':
      return !isNaN(parseInt(value)) && parseInt(value) > 0;
    case 'GROQ_API_KEY':
    case 'BRAVE_API_KEY':
    case 'CEREBRAS_API_KEY':
    case 'HYPERBOLIC_API_KEY':
      return value.length > 0;
    case 'PINATA_API_KEY':
    case 'PINATA_SECRET_API_KEY':
      return value.length > 0;
    case 'PINATA_JWT':
      return value.length > 0 && value.split('.').length >= 2;
    default:
      return true;
  }
}

async function main() {
  console.log('\n🔍 Production Environment Verification\n');
  console.log('='.repeat(60));

  let allRequiredSet = true;
  let warnings = [];

  console.log('\n📋 Required Environment Variables:\n');

  for (const varName of REQUIRED_VARS) {
    const value = process.env[varName];
    const isSet = !!value;
    
    // Debug invalid values
    if (isSet && !validateVariable(varName, value)) {
      if (varName === 'CONTRACT_ATTESTATION' || varName === 'CONTRACT_STAKING') {
        console.log(`\n   DEBUG ${varName}:`);
        console.log(`     Value: "${value}"`);
        console.log(`     Length: ${value?.length}`);
        console.log(`     Trimmed: "${value?.trim()}"`);
        console.log(`     Trimmed Length: ${value?.trim()?.length}`);
        console.log(`     isEthereumAddress: ${isEthereumAddress(value)}\n`);
      }
    }
    
    const isValid = isSet ? validateVariable(varName, value) : false;
    const status = !isSet ? '❌' : isValid ? '✅' : '⚠️';
    const maskedValue = value ? maskKey(value) : 'NOT SET';

    console.log(`${status} ${varName.padEnd(30)} ${maskedValue}`);

    if (!isSet) {
      allRequiredSet = false;
    } else if (!isValid) {
      warnings.push(`${varName} is set but invalid format`);
    }
  }

  console.log('\n📋 Optional Environment Variables:\n');

  for (const varName of OPTIONAL_VARS) {
    const value = process.env[varName];
    const isSet = !!value;
    const status = isSet ? '✅' : '⭕';
    const maskedValue = value ? maskKey(value) : 'NOT SET';

    console.log(`${status} ${varName.padEnd(30)} ${maskedValue}`);
  }

  console.log('\n🌐 External Service Verification:\n');

  const privateKey = process.env.TEE_PRIVATE_KEY;
  if (privateKey) {
    const { ethers } = require('ethers');
    const wallet = new ethers.Wallet(privateKey);
    const walletAddress = wallet.address;
    console.log(`📧 TEE Wallet Address: ${walletAddress}`);

    console.log('🔎 Checking EigenAI Grant...');
    const grantInfo = await checkEigenAIGrant(walletAddress);
    if (grantInfo.hasGrant) {
      console.log(`✅ EigenAI Grant: ${grantInfo.tokenCount.toLocaleString()} tokens available`);
    } else {
      console.log('⚠️  EigenAI Grant: No grant found (will use fallback providers)');
      warnings.push('TEE wallet does not have EigenAI grant');
    }
  }

  const rpcUrl = process.env.RPC_URL;
  if (rpcUrl) {
    console.log('\n🔎 Checking RPC Connection...');
    const rpcValid = await verifyRpcUrl(rpcUrl);
    if (rpcValid) {
      console.log('✅ RPC Connection: Successful');
    } else {
      console.log('❌ RPC Connection: Failed');
      warnings.push('RPC URL is not accessible');
    }
  }

  const pinataKey = process.env.PINATA_API_KEY;
  const pinataSecret = process.env.PINATA_SECRET_API_KEY;
  if (pinataKey && pinataSecret) {
    console.log('\n🔎 Checking IPFS (Pinata) Connection...');
    const ipfsValid = await verifyIpfsKeys(pinataKey, pinataSecret);
    if (ipfsValid) {
      console.log('✅ IPFS Connection: Successful');
    } else {
      console.log('⚠️  IPFS Connection: Failed (JWT might work even if API key fails)');
    }
  }

  console.log('\n📊 Summary:\n');
  console.log('='.repeat(60));

  if (allRequiredSet) {
    console.log('✅ All required environment variables are set!');
  } else {
    console.log('❌ Some required environment variables are missing!');
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach((warning, index) => {
      console.log(`   ${index + 1}. ${warning}`);
    });
  } else {
    console.log('\n✅ No warnings detected!');
  }

  console.log('\n📝 Configuration Status:\n');
  console.log(`   Node Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Port: ${process.env.PORT || '3000'}`);
  console.log(`   SGX Enabled: ${process.env.SGX_ENABLED === 'true' ? 'Yes' : 'No'}`);
  console.log(`   Mock TEE: ${process.env.USE_MOCK_TEE === 'true' ? 'Yes' : 'No'}`);

  console.log('\n💡 Next Steps:\n');

  if (!allRequiredSet) {
    console.log('   1. Set all required environment variables');
    console.log('   2. Copy .env.production to .env');
    console.log('   3. Run this script again to verify');
  } else {
    console.log('   1. Build Docker image: docker build -f Dockerfile.tee -t tee-service .');
    console.log('   2. Run container: docker run --env-file .env -p 3000:3000 tee-service');
    console.log('   3. Verify health: curl http://localhost:3000/health');
    console.log('   4. Test session creation: See PRODUCTION_DEPLOYMENT.md');
  }

  console.log('\n' + '='.repeat(60) + '\n');

  process.exit(allRequiredSet ? 0 : 1);
}

main().catch(console.error);
