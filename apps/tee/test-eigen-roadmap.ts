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

console.log('Wallet Address:', walletAddress);
console.log('Prompt length:', prompt.length);

(async () => {
  try {
    console.log('\n1. Getting grant message...');
    const grantResponse = await axios.get(`${GRANT_ENDPOINT}?address=${walletAddress}`);
    const grantMessage = grantResponse.data.message;
    console.log('Grant Message:', grantMessage);
    
    console.log('\n2. Signing message...');
    const grantSignature = await account.signMessage({ message: grantMessage });
    
    console.log('\n3. Making chat completions request with roadmap prompt...');
    const payload = {
      messages: [
        { role: 'system', content: 'You are a Brutal Tech Mentor & Project Architect. Output valid JSON only.' },
        { role: 'user', content: prompt }
      ],
      model: 'gpt-oss-120b-f16',
      max_tokens: 4000,
      seed: 3441822040,
      grantMessage,
      grantSignature,
      walletAddress
    };
    
    console.log('Payload size:', JSON.stringify(payload).length, 'bytes');
    
    const chatResponse = await axios.post(CHAT_ENDPOINT, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000
    });
    
    console.log('\n✅ Success!');
    const content = chatResponse.data.choices[0].message.content;
    console.log('Response length:', content.length);
    console.log('Response preview:', content.substring(0, 300));
  } catch (error: any) {
    console.error('\n❌ Error:');
    console.error('Message:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
})();
