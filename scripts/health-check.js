const http = require('http');

const checks = [
  { name: 'TEE Service', url: process.env.TEE_URL || 'http://localhost:3001/health', required: false },
  { name: 'Frontend', url: process.env.FRONTEND_URL || 'http://localhost:3000', required: true }
];

async function check() {
  console.log('\n=== Health Check ===\n');
  
  for (const check of checks) {
    try {
      const response = await fetch(check.url);
      const status = response.status === 200 ? 'OK' : 'Warning';
      const symbol = response.status === 200 ? '✅' : '⚠️';
      console.log(`${symbol} ${check.name}: ${status} (${response.status})`);
    } catch (e) {
      const symbol = check.required ? '❌' : '⚠️';
      console.log(`${symbol} ${check.name}: ${e.message}`);
    }
  }
  
  console.log('\n=== End Health Check ===\n');
}

check().catch(console.error);
