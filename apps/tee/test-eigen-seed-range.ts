import axios from 'axios';
import { privateKeyToAccount } from 'viem/accounts';
import dotenv from 'dotenv';

dotenv.config();

const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY || '';
const GRANT_ENDPOINT = 'https://determinal-api.eigenarcade.com/message';
const CHAT_ENDPOINT = 'https://determinal-api.eigenarcade.com/api/chat/completions';

const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
const walletAddress = account.address;

async function testSeed(seed: number): Promise<boolean> {
  try {
    const grantResponse = await axios.get(`${GRANT_ENDPOINT}?address=${walletAddress}`);
    const grantMessage = grantResponse.data.message;
    const grantSignature = await account.signMessage({ message: grantMessage });
    
    await axios.post(CHAT_ENDPOINT, {
      messages: [
        { role: 'system', content: 'You are a Brutal Tech Mentor. Output valid JSON only.' },
        { role: 'user', content: 'Generate a short JSON with field "test": "value".' }
      ],
      model: 'gpt-oss-120b-f16',
      max_tokens: 100,
      seed: seed,
      grantMessage,
      grantSignature,
      walletAddress
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    
    return true;
  } catch (error: any) {
    return false;
  }
}

async function findRange() {
  const testSeeds = [
    42,
    3441822040,
    4000000000,
    3000000000,
    2000000000,
    1000000000,
    500000000,
    250000000,
    100000000,
    50000000,
    25000000,
    10000000,
    5000000,
    1000000,
    500000,
    100000,
  ];
  
  console.log('Testing seed ranges:\n');
  for (const seed of testSeeds) {
    const result = await testSeed(seed);
    console.log(`Seed ${String(seed).padStart(10)}: ${result ? '✅ PASS' : '❌ FAIL'}`);
  }
  
  console.log('\nTesting problematic seed range 3400000000-3500000000:');
  let failures = [];
  for (let seed = 3400000000; seed <= 3500000000; seed += 10000000) {
    const result = await testSeed(seed);
    if (!result) {
      failures.push(seed);
    }
    console.log(`Seed ${seed}: ${result ? '✅' : '❌'}`);
  }
  
  console.log(`\nFailed seeds in range: ${failures.join(', ')}`);
}

findRange();
