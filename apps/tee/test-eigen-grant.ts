import axios from 'axios';
import { privateKeyToAccount } from 'viem/accounts';
import dotenv from 'dotenv';

dotenv.config();

const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY || '';
const GRANT_ENDPOINT = 'https://determinal-api.eigenarcade.com/message';
const CHAT_ENDPOINT = 'https://determinal-api.eigenarcade.com/api/chat/completions';

const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
const walletAddress = account.address;

console.log('Wallet Address:', walletAddress);

(async () => {
  try {
    console.log('\n1. Getting grant message...');
    const grantResponse = await axios.get(`${GRANT_ENDPOINT}?address=${walletAddress}`);
    const grantMessage = grantResponse.data.message;
    console.log('Grant Message:', grantMessage);
    
    console.log('\n2. Signing message...');
    const grantSignature = await account.signMessage({ message: grantMessage });
    console.log('Signature:', grantSignature);
    
    console.log('\n3. Making chat completions request...');
    const chatResponse = await axios.post(CHAT_ENDPOINT, {
      messages: [
        { role: 'system', content: 'You are a helpful assistant. Output valid JSON only.' },
        { role: 'user', content: 'Write a short poem about decentralized AI.' }
      ],
      model: 'gpt-oss-120b-f16',
      max_tokens: 100,
      seed: 42,
      grantMessage,
      grantSignature,
      walletAddress
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });
    
    console.log('\n✅ Success!');
    console.log('Response:', chatResponse.data.choices[0].message.content);
  } catch (error: any) {
    console.error('\n❌ Error:');
    console.error('Message:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
})();