import axios from 'axios';

async function testRoadmapEndpoint() {
  try {
    console.log('Testing roadmap generation endpoint...');
    
    const response = await axios.post('http://localhost:3001/challenge/generate', {
      mode: 'pro',
      userAddress: '0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48',
      deep: true,
      topic: 'Next.js App Router'
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000
    });
    
    console.log('✅ SUCCESS');
    console.log('Response keys:', Object.keys(response.data));
    console.log('Has roadmap:', !!response.data.roadmap);
    console.log('Modules count:', response.data.roadmap?.modules?.length || 0);
    
    // Check if EigenAI was used
    if (response.data.roadmap?.modules?.length === 7) {
      console.log('✅ VALID: 7 modules generated - likely EigenAI');
    }
    
  } catch (error: any) {
    console.log('❌ FAILED');
    console.error('Message:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testRoadmapEndpoint();
