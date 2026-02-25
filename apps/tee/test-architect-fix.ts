import { ArchitectAgent } from './src/agents/ArchitectAgent';
import { LLMService } from './src/services/llm/LLMService';
import dotenv from 'dotenv';

dotenv.config();

async function testArchitectAgent() {
  console.log('Testing ArchitectAgent with fixed seed generation...\n');
  
  try {
    const llmService = new LLMService(
      '', // cerebrasKey
      process.env.GROQ_API_KEY || '',
      '', // braveKey
      '', // hyperbolicKey
      '', // eigenKey
      process.env.WALLET_PRIVATE_KEY || ''
    );
    
    const architect = new ArchitectAgent(llmService);
    
    console.log('Generating roadmap for: Next.js App Router');
    const roadmap = await architect.generateRoadmap(
      '0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48',
      'Next.js App Router',
      1
    );
    
    console.log('\n✅ SUCCESS!');
    console.log('Title:', roadmap.title);
    console.log('Modules count:', roadmap.modules?.length || 0);
    
    if (roadmap.modules && roadmap.modules.length === 7) {
      console.log('✅ VALID: Exactly 7 modules generated');
      console.log('\nFirst module preview:');
      console.log('  Title:', roadmap.modules[0].title);
      console.log('  Context:', roadmap.modules[0].context?.substring(0, 100) + '...');
    } else {
      console.log('❌ INVALID: Expected 7 modules');
    }
    
  } catch (error: any) {
    console.log('\n❌ FAILED');
    console.error('Error:', error.message);
  }
}

testArchitectAgent();
