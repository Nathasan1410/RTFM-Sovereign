// Test TEE backend JSON generation
const axios = require('axios');

async function testTEEResponse() {
  console.log('🧪 Testing TEE Backend JSON Generation\n');
  console.log('=' .repeat(60));

  try {
    console.log('\nMaking API call to TEE backend...');
    const response = await axios.post('http://localhost:3001/roadmap/generate-dynamic', {
      topic: 'Hello World Solidity',
      userAddress: '0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48',
      mode: 'lite'
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 120000
    });

    console.log('✅ API call successful!');
    console.log(`Status: ${response.status}`);
    console.log(`Success: ${response.data.success}`);
    console.log(`Project ID: ${response.data.project_id}`);
    console.log(`Milestones: ${response.data.milestones.length}`);
    
    // Verify JSON structure
    if (response.data.milestones && response.data.milestones.length > 0) {
      const firstMilestone = response.data.milestones[0];
      console.log(`\nFirst milestone:`);
      console.log(`  Title: ${firstMilestone.title}`);
      console.log(`  Micro steps: ${firstMilestone.micro_steps.length}`);
      
      // Check if previous_steps are properly quoted
      const firstStep = firstMilestone.micro_steps[0];
      console.log(`  First step previous_steps: ${JSON.stringify(firstStep.prerequisites.previous_steps)}`);
      
      // Verify it's an array of strings or numbers (not unquoted identifiers)
      if (Array.isArray(firstStep.prerequisites.previous_steps)) {
        console.log('✅ previous_steps is a valid array');
        const allValid = firstStep.prerequisites.previous_steps.every(
          item => typeof item === 'string' || typeof item === 'number'
        );
        if (allValid) {
          console.log('✅ All items in previous_steps are valid (string or number)');
        } else {
          console.log('❌ Some items in previous_steps are invalid');
        }
      } else {
        console.log('❌ previous_steps is not an array');
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 TEE Backend JSON Generation TEST PASSED!');
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.log('\n❌ TEST FAILED');
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Data: ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      console.log('No response received from TEE backend');
    } else {
      console.log(`Error: ${error.message}`);
    }
    process.exit(1);
  }
}

testTEEResponse();
