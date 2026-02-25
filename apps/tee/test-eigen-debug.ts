import axios from 'axios';
import { privateKeyToAccount } from 'viem/accounts';
import dotenv from 'dotenv';

dotenv.config();

const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY || '';
const GRANT_ENDPOINT = 'https://determinal-api.eigenarcade.com/message';
const CHAT_ENDPOINT = 'https://determinal-api.eigenarcade.com/api/chat/completions';

const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
const walletAddress = account.address;

async function testVariation(name: string, systemPrompt: string, userPrompt: string, maxTokens: number = 4000) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${name}`);
  console.log('='.repeat(60));
  
  try {
    const grantResponse = await axios.get(`${GRANT_ENDPOINT}?address=${walletAddress}`);
    const grantMessage = grantResponse.data.message;
    const grantSignature = await account.signMessage({ message: grantMessage });
    
    const payload = {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      model: 'gpt-oss-120b-f16',
      max_tokens: maxTokens,
      seed: 42,
      grantMessage,
      grantSignature,
      walletAddress
    };
    
    console.log('System prompt length:', systemPrompt.length);
    console.log('User prompt length:', userPrompt.length);
    console.log('max_tokens:', maxTokens);
    
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
  
  await testVariation(
    'Test 1: Simple prompts',
    'You are a helpful assistant.',
    'Write a short poem about decentralized AI.',
    100
  );
  
  await testVariation(
    'Test 2: JSON output requirement',
    'You are a Brutal Tech Mentor. Output valid JSON only.',
    'Write a short poem about decentralized AI. Return as JSON with field "poem".',
    100
  );
  
  await testVariation(
    'Test 3: Longer JSON prompt',
    'You are a Brutal Tech Mentor & Project Architect. Output valid JSON only.',
    'Generate a learning roadmap for "Next.js" with exactly 3 modules. Each module should have title and context. Output as JSON with "modules" array.',
    1000
  );
  
  await testVariation(
    'Test 4: Original roadmap prompt',
    'You are a Brutal Tech Mentor & Project Architect. Output valid JSON only.',
    `Generate a rigorous learning roadmap for "Next.js App Router" with exactly 7 modules.
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
Generate 5-7 micro-steps. Output valid JSON only.`,
    4000
  );
  
  await testVariation(
    'Test 5: Same prompt with reduced max_tokens',
    'You are a Brutal Tech Mentor & Project Architect. Output valid JSON only.',
    `Generate a rigorous learning roadmap for "Next.js App Router" with exactly 7 modules.
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
Generate 5-7 micro-steps. Output valid JSON only.`,
    2000
  );
})();
