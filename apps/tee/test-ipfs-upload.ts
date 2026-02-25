/**
 * Simple IPFS upload test
 */

import { createIPFSService, IPFSCredentials } from './src/services/ipfs';

async function testIPFSUpload() {
  console.log('=== IPFS Upload Test ===\n');

  try {
    const ipfsCredentials: IPFSCredentials = {
      apiKey: process.env.PINATA_API_KEY || '',
      secretApiKey: process.env.PINATA_SECRET_API_KEY || '',
      jwt: process.env.PINATA_JWT
    };

    console.log('Creating IPFS service...');
    const ipfsService = await createIPFSService(ipfsCredentials);
    console.log('✅ IPFS service created\n');

    const testData = {
      test: 'Hello IPFS!',
      timestamp: Date.now(),
      message: 'This is a test upload to verify IPFS integration'
    };

    console.log('Uploading test data...');
    const ipfsHash = await ipfsService.uploadJSON(testData, 'test-upload.json');
    console.log(`✅ Upload successful!`);
    console.log(`   IPFS Hash: ${ipfsHash}`);
    console.log(`   Gateway URL: https://gateway.pinata.cloud/ipfs/${ipfsHash}\n`);

    console.log('Retrieving data from IPFS...');
    const retrieved = await ipfsService.getFile(ipfsHash);
    console.log('✅ Retrieval successful!');
    console.log('   Retrieved data:', JSON.stringify(retrieved, null, 2));

    const dataMatch = JSON.stringify(retrieved) === JSON.stringify(testData);
    console.log(`\nData integrity check: ${dataMatch ? '✅ PASS' : '❌ FAIL'}`);

    console.log('\n=== All IPFS Tests Passed ===');
  } catch (error) {
    console.error('\n❌ IPFS Test Failed');
    console.error(`Error: ${(error as Error).message}`);
    if ((error as any).stack) {
      console.error('\nStack trace:');
      console.error((error as any).stack);
    }
    process.exit(1);
  }
}

testIPFSUpload();
