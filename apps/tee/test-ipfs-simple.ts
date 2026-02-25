/**
 * Simple IPFS upload test with new credentials
 */

import { createIPFSService, IPFSCredentials } from './src/services/ipfs';

async function testIPFSUploadSimple() {
  console.log('=== IPFS Simple Upload Test ===\n');

  try {
    const ipfsCredentials: IPFSCredentials = {
      apiKey: 'f59d712d954fa8138789',
      secretApiKey: '77ad7eb824848831bc4f5d37992b0f4b771ba269ec97cc5bb204a396efdda427',
      jwt: undefined
    };

    console.log('Creating IPFS service...');
    const ipfsService = await createIPFSService(ipfsCredentials);
    console.log('✅ IPFS service created\n');

    const testData = {
      test: 'Hello IPFS!',
      timestamp: Date.now(),
      message: 'This is a test upload to verify IPFS integration with new credentials'
    };

    console.log('Uploading test data...');
    const ipfsHash = await ipfsService.uploadJSON(testData, 'test-upload-new.json');
    console.log(`✅ Upload successful!`);
    console.log(`   IPFS Hash: ${ipfsHash}`);
    console.log(`   Gateway URL: https://gateway.pinata.cloud/ipfs/${ipfsHash}\n`);

    console.log('Retrieving data from IPFS...');
    const retrieved = await ipfsService.getFile(ipfsHash);
    console.log('✅ Retrieval successful!');
    console.log(`   Retrieved: ${JSON.stringify(retrieved, null, 2)}`);

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

testIPFSUploadSimple();
