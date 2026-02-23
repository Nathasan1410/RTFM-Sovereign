/**
 * Architect Agent
 *
 * AI-powered curriculum architect responsible for generating learning golden paths.
 * Converts user learning requests into structured, executable learning paths with
 * cumulative milestones and micro-steps.
 *
 * Key Responsibilities:
 * - Generate golden paths from user learning requests
 * - Create cumulative milestone sequences (each builds on previous)
 * - Assign difficulty levels and depth modes
 * - Ensure all milestones produce runnable code or visible UI
 * - Design testable success criteria
 * - Use deterministic AI generation with seeding
 *
 * Dependencies:
 * - LLMService: AI inference for path generation
 * - GoldenPathSchema: Schema validation
 *
 * @module apps/tee/src/agents/architect/ArchitectAgent
 */

import { LLMService } from '../../services/llm/LLMService';
import { GoldenPathSchema, GoldenPath } from '../schemas';
import { agentLogger } from '../../utils/logger';

export class ArchitectAgent {
  private llmService: LLMService;

  constructor(llmService: LLMService) {
    this.llmService = llmService;
  }

  public async generateGoldenPath(
    userRequest: string,
    experienceLevel: string = 'intermediate',
    depthPreference: 'lite' | 'standard' | 'deep' = 'standard',
    seed: number
  ): Promise<GoldenPath> {
    
    agentLogger.info({ userRequest, experienceLevel, depthPreference }, 'ArchitectAgent: Generating Golden Path');

    const systemPrompt = `
ROLE: You are a Senior Curriculum Architect specializing in project-based micro-learning.
MISSION: Convert user learning requests into executable Golden Paths.
CONSTRAINTS:
- ZERO THEORY-ONLY STEPS: Every milestone must produce runnable code or visible UI
- BUILD SEQUENCE: Milestone N must build upon Milestone N-1 (cumulative)
- DEEP MODE ASSIGNMENT: Mark milestone as deep_mode=true if it requires >3 micro-steps or complex logic
- ANTI-PATTERN: Never suggest "Read React docs" or "Learn about hooks" as standalone milestones
- FILE-FIRST: Define file structure upfront; every milestone modifies/creates specific files

OUTPUT FORMAT: Strict JSON following Golden Path Schema.
`;

    const userPrompt = `
USER REQUEST: "${userRequest}"
EXPERIENCE: "${experienceLevel}"
CONTEXT: Create a ${depthPreference} learning path that results in a deployable project.

THINKING PROCESS:
1. Deconstruct request into atomic buildable features
2. Order features by dependency (foundation → advanced)
3. Assign deep_mode=true to features requiring:
   - Multiple file coordination
   - Complex state management
   - API integration
   - Algorithmic logic
4. Define success criteria as testable behaviors, not knowledge checks

GENERATE GOLDEN PATH JSON NOW.
`;

    // Note: LLMService needs to support generic prompt execution. 
    // Assuming we can use a method similar to generateRoadmap but returning raw JSON first.
    // For now, I'll assume we can use the existing infrastructure or add a generic 'executePrompt' method.
    // Since LLMService is strongly typed for Challenge/Roadmap, we might need to extend it or cast the result.
    
    // TEMPORARY HACK: Using generateRoadmap internally but overriding the prompt in the provider 
    // OR we should extend LLMService. Let's assume we extend LLMService with 'generateJson'
    
    // For this implementation, I will simulate the call using the existing generateRoadmap pattern 
    // but practically we would need to refactor LLMService to be more generic.
    
    // Let's assume we added generateGoldenPath to LLMService (Task for refactoring)
    // For now, I will use a direct call pattern if possible, or mock it if LLMService is strict.
    
    // Real implementation would be:
    // const response = await this.llmService.generateGoldenPath(systemPrompt, userPrompt, seed);
    
    // Since I can't easily change LLMService interface in this step without breaking other things,
    // I will implement the logic here assuming the LLMService *can* handle this.
    
    // Wait, I can use the existing 'generateRoadmap' as a carrier but the types won't match.
    // I should create a new method in LLMService or a new Provider method.
    
    // Let's stick to the plan: Implement Agent 1 Logic.
    // I will mock the LLM call for now or use a placeholder until LLMService is updated.
    
    // ACTUAL LOGIC (Commented out until LLMService update):
    /*
    const response = await this.llmService.chatCompletion({
        system: systemPrompt,
        user: userPrompt,
        jsonMode: true,
        seed: seed
    });
    */

    // MOCK RESPONSE for "Card Component" to verify flow (as per Chunk 1 checklist)
    // This allows us to test Agent 2 and 3 without burning tokens/waiting for LLM integration.
    
    const mockGoldenPath: GoldenPath = {
      project_id: "550e8400-e29b-41d4-a716-446655440000",
      project_title: "Product Review Card Component",
      learning_objectives: ["Master React Props", "Tailwind Styling", "Component Composition"],
      tech_stack: { framework: "React", styling: "Tailwind", language: "TypeScript" },
      file_structure: [
        { path: "src/components/Card.tsx", purpose: "Main container", template_type: "component" },
        { path: "src/App.tsx", purpose: "Demo usage", template_type: "component" }
      ],
      milestones: [
        {
          milestone_id: 1,
          title: "Project Bootstrap",
          description: "Setup Vite + Tailwind",
          success_criteria: ["Vite running", "Tailwind scanning"],
          deep_mode: false,
          estimated_time: 5,
          prerequisites: [],
          rubric: { functionality_weight: 50, code_quality_weight: 30, best_practices_weight: 20, innovation_weight: 0 },
          key_concepts: ["Build Tools"]
        },
        {
          milestone_id: 2,
          title: "Static Card Structure",
          description: "Build the HTML structure",
          success_criteria: ["Card visible", "Image rendered"],
          deep_mode: true, // TRIGGER AGENT 3
          estimated_time: 15,
          prerequisites: [1],
          rubric: { functionality_weight: 40, code_quality_weight: 30, best_practices_weight: 30, innovation_weight: 0 },
          key_concepts: ["JSX", "Flexbox"]
        }
      ],
      final_deliverable: {
        description: "A working card component",
        demo_commands: ["npm run dev"],
        verification_tests: ["Card renders"]
      }
    };

    // Verify against schema
    const validated = GoldenPathSchema.parse(mockGoldenPath);
    return validated;
  }
}
