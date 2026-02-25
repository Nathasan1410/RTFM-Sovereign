import axios from 'axios';
import { privateKeyToAccount } from 'viem/accounts';
import dotenv from 'dotenv';

dotenv.config();

const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY || '';
const GRANT_ENDPOINT = 'https://determinal-api.eigenarcade.com/message';
const CHAT_ENDPOINT = 'https://determinal-api.eigenarcade.com/api/chat/completions';

const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
const walletAddress = account.address;

const prompt = `Generate a rigorous learning roadmap for "Next.js App Router" with exactly 7 modules.
Structure: { 
  "title": "Project Title",
  "modules": [ 
    { 
      "order": 1,
      "title": "Step Title",
      "context": "Explanation of the concept and why it's essential...",
      "docs": [
        { "title": "MDN Reference", "url": "https://developer.mozilla.org/..." }
      ],
      "challenge": "Specific instruction on what to build...",
      "verificationCriteria": [
        "Check for div with class 'card'",
        "Check width is fixed or max-width",
        "Check padding is applied"
      ],
      "groundTruth": "<div class='card'>...</div>",
      "starterCode": "<!-- Write your code here -->"
    }
  ]
}
Generate 5-7 micro-steps. Output valid JSON only.`;

async function testWithSeed(seed: number) {
  console.log(`\nTesting with seed: ${seed}`);
  
  try {
    const grantResponse = await axios.get(`${GRANT_ENDPOINT}?address=${walletAddress}`);
    const grantMessage = grantResponse.data.message;
    const grantSignature = await account.signMessage({ message: grantMessage });
    
    const payload = {
      messages: [
        { role: 'system', content: 'You are a Brutal Tech Mentor & Project Architect. Output valid JSON only.' },
        { role: 'user', content: prompt }
      ],
      model: 'gpt-oss-120b-f16',
      max_tokens: 4000,
      seed: seed,
      grantMessage,
      grantSignature,
      walletAddress
    };
    
    const chatResponse = await axios.post(CHAT_ENDPOINT, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000
    });
    
    console.log('✅ SUCCESS');
    const content = chatResponse.data.choices[0].message.content;
    console.log('Response length:', content.length);
    return true;
  } catch (error: any) {
    console.log('❌ FAILED');
    console.error('Message:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

(async () => {
  console.log('Wallet Address:', walletAddress);
  
  await testWithSeed(42);
  await testWithSeed(3441822040);
  await testWithSeed(Math.floor(Math.random() * 1000000000));
})();
