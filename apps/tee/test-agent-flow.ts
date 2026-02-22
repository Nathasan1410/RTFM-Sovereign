
import { LLMService } from './src/services/llm/LLMService';
import { ArchitectAgent } from './src/agents/architect/ArchitectAgent';
import { ProjectManagerAgent } from './src/agents/manager/ProjectManagerAgent';
import { SwarmAgent } from './src/agents/swarm/SwarmAgent';
import { agentLogger } from './src/utils/logger';

// Mock LLM Service (since we're testing logic flow, not API calls)
const mockLLMService = {} as LLMService;

async function runEndToEndTest() {
  console.log('🚀 Starting End-to-End Agent Flow Test: Card Component');

  // 1. Initialize Agents
  const architect = new ArchitectAgent(mockLLMService);
  const swarm = new SwarmAgent(mockLLMService);
  const manager = new ProjectManagerAgent(swarm);

  // 2. Agent 1: Generate Golden Path
  console.log('\n[AGENT 1] Generating Golden Path...');
  const goldenPath = await architect.generateGoldenPath(
    'Build a Product Review Card',
    'intermediate',
    'standard',
    12345
  );
  console.log(`✅ Golden Path Generated: "${goldenPath.project_title}" with ${goldenPath.milestones.length} milestones`);

  // 3. Agent 2: Create Session
  console.log('\n[AGENT 2] Creating Session...');
  const sessionId = await manager.createSession('0xTestUser', goldenPath);
  console.log(`✅ Session Created: ${sessionId}`);

  // 4. Agent 2: Process Milestone 1 (Lite Mode)
  console.log('\n[AGENT 2] Processing Milestone 1 (Lite Mode)...');
  const result1 = await manager.processMilestone(sessionId);
  console.log(`✅ Milestone 1 Result: ${JSON.stringify(result1)}`);

  // 5. Simulate Milestone 1 Completion & Advance to Milestone 2
  // (In real app, this happens via user submission + verification)
  // For test, we hack the session state internally or just mock the next step.
  // Since session state is private in Manager, we can't easily modify it here without exposing methods.
  // However, for the purpose of this test, we want to see if Manager delegates to Swarm correctly.
  // Milestone 2 in our mock Golden Path is DEEP MODE.
  
  // Let's force the manager to process Milestone 2 by updating the session manually via a (temporary) public method 
  // or by recreating the session with current_milestone = 2 (if createSession allowed overrides, which it doesn't).
  
  // Instead, I'll modify ProjectManagerAgent to allow state updates for testing, 
  // OR just add a test method.
  // A cleaner way for this script: We can just instantiate a new session where we *pretend* we are at M2? 
  // No, createSession is strict.
  
  // Let's use reflection/any cast to update the private state for testing purposes.
  const managerAny = manager as any;
  const session = managerAny.sessions.get(sessionId);
  session.project.current_milestone = 2; // Advance to Deep Mode Milestone
  console.log('\n[SYSTEM] Advanced Session to Milestone 2 (Deep Mode)');

  // 6. Agent 2 -> Agent 3: Process Milestone 2 (Deep Mode)
  console.log('\n[AGENT 2 -> AGENT 3] Processing Milestone 2 (Deep Mode Swarm)...');
  const result2 = await manager.processMilestone(sessionId);
  
  console.log(`✅ Milestone 2 Result Status: ${result2.status}`);
  console.log(`✅ Swarm Output Steps: ${result2.swarm_output.steps.length}`);
  console.log(`✅ First Step Code: ${result2.swarm_output.steps[0].output_deliverable.code_changes[0].content}`);

  console.log('\n🎉 End-to-End Flow Verification Complete!');
}

runEndToEndTest().catch(console.error);
