import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

(async () => {
  try {
    console.log('Testing challenge generation...');
    console.log('User Address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb');
    console.log('Topic: solidity');
    console.log('');
    
    const response = await axios.post('http://localhost:3001/challenge/generate', {
      userAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      topic: 'solidity'
    }, { timeout: 60000 });
    
    console.log('Success!');
    console.log('Modules count:', response.data.modules?.length);
    console.log('First question:', response.data.modules?.[0]?.questions?.[0]?.prompt);
  } catch (error: any) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
})();