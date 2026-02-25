/**
 * Test IPFS upload using exact format from working PowerShell script
 */

import axios from 'axios';

async function testIPFSDirect() {
  console.log('=== IPFS Direct API Test ===\n');

  try {
    const testData = {
      pinataContent: {
        name: 'test',
        description: 'Direct API test from Node.js'
      },
      pinataMetadata: {
        name: 'test-metadata-node'
      }
    };

    console.log('Making direct Pinata API request...');
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      testData,
      {
        headers: {
          'Content-Type': 'application/json',
          'pinata_api_key': 'f59d712d954fa8138789',
          'pinata_secret_api_key': '77ad7eb824848831bc4f5d37992b0f4b771ba269ec97cc5bb204a396efdda427'
        }
      }
    );

    console.log('✅ Upload successful!');
    console.log(`   IPFS Hash: ${response.data.IpfsHash}`);
    console.log(`   Pin Size: ${response.data.PinSize}`);
    console.log(`   Timestamp: ${response.data.Timestamp}`);

    console.log('\n=== Test Complete ===');
  } catch (error) {
    console.error('\n❌ Test Failed');
    if (axios.isAxiosError(error)) {
      console.error(`Status: ${error.response?.status}`);
      console.error(`Response:`, error.response?.data);
    } else {
      console.error(`Error: ${(error as Error).message}`);
    }
    process.exit(1);
  }
}

testIPFSDirect();
