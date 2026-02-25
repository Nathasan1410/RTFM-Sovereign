#!/usr/bin/env node

/**
 * Production Environment Verification Script
 * 
 * This script verifies that all required environment variables are set
 * and that external services are accessible.
 * 
 * Usage: node verify-production-env.ts
 */

import { config } from 'dotenv';
import axios from 'axios';

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

function isHexPrivateKey(key: string): boolean {
  const trimmed = key?.trim();
  if (!trimmed || trimmed.length !== 66) return false;
  return trimmed.startsWith('0x') && /^[0-9a-fA-F]{64}$/.test(trimmed);
}

function isEthereumAddress(address: string): boolean {
  if (!address || address.length !== 42) return false;
  return address.startsWith('0x') && /^[0-9a-fA-F]{40}$/.test(address);
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function maskKey(key: string, showFirst: number = 6, showLast: number = 4): string {
  if (key.length < showFirst + showLast) return '***';
  return `${key.substring(0, showFirst)}${'*'.repeat(key.length - showFirst - showLast)}${key.substring(key.length - showLast)}`;
}

async function checkEigenAIGrant(address: string): Promise<{ hasGrant: boolean; tokenCount: number }> {
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

async function verifyRpcUrl(url: string): Promise<boolean> {
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

async function verifyIpfsKeys(apiKey: string, secretKey: string): Promise<boolean> {
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

async function main() {
  console.log('\n🔍 Production Environment Verification\n');
  console.log('='.repeat(60));

  let allRequiredSet = true;
  let warnings: string[] = [];

  console.log('\n📋 Required Environment Variables:\n');

  for (const varName of REQUIRED_VARS) {
    const value = process.env[varName];
    const isSet = !!value;
    const isValid = isSet ? validateVariable(varName, value!) : false;
    const status = !isSet ? '❌' : isValid ? '✅' : '⚠️';
    const maskedValue = value ? maskKey(value) : 'NOT SET';
    
    if (!isValid && isSet && (varName === 'CONTRACT_ATTESTATION' || varName === 'CONTRACT_STAKING')) {
      console.log(`DEBUG ${varName}: value="${value}", len=${value?.length}, starts0x=${value?.startsWith('0x')}`);
    }

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
    const { ethers } = await import('ethers');
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

function validateVariable(varName: string, value: string): boolean {
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

// Test validation functions
if (process.env.DEBUG_VALIDATION) {
  console.log('\n🐛 DEBUG: Testing validation functions...\n');
  const testAddr = process.env.CONTRACT_ATTESTATION ?? '';
  console.log(`isEthereumAddress("${testAddr}") =`, isEthereumAddress(testAddr));
  
  const testKey = process.env.TEE_PRIVATE_KEY ?? '';
  console.log(`isHexPrivateKey("${testKey.substring(0, 20)}...") =`, isHexPrivateKey(testKey));
}

main().catch(console.error);
