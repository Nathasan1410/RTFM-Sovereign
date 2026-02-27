// Test frontend API call
const axios = require('axios');

async function testFrontendAPI() {
  console.log('🧪 Testing Frontend API Call\n');
  console.log('=' .repeat(60));

  try {
    console.log('\nMaking API call to frontend /api/generate...');
    const response = await axios.post('http://localhost:3000/api/generate', {
      topic: 'Hello World Solidity',
      version: 'lite',
      mode: 'proof',
      userAddress: '0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48'
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 120000
    });

    console.log('✅ Frontend API call successful!');
    console.log(`Status: ${response.status}`);
    console.log(`Title: ${response.data.title}`);
    console.log(`Modules: ${response.data.modules.length}`);
    console.log(`Session ID: ${response.data.sessionId || 'N/A (demo mode)'}`);
    
    // Check first module
    if (response.data.modules.length > 0) {
      const firstModule = response.data.modules[0];
      console.log(`\nFirst module:`);
      console.log(`  Title: ${firstModule.title}`);
      console.log(`  Challenge length: ${firstModule.challenge?.length || 0} chars`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 Frontend API Call TEST PASSED!');
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.log('\n❌ TEST FAILED');
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Error: ${error.response.data?.error || error.response.data}`);
      console.log(`Stack: ${error.response.data?.stack || 'N/A'}`);
    } else if (error.request) {
      console.log('No response received from frontend');
      console.log(`Error code: ${error.code}`);
    } else {
      console.log(`Error: ${error.message}`);
    }
    process.exit(1);
  }
}

testFrontendAPI();
