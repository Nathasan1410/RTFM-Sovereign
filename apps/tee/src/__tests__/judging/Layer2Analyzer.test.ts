import { Layer2Analyzer, MockEigenAIClient } from '../../judging/layers/Layer2Analyzer';
import { CodeSubmission, RubricSchema, Layer1Result } from '../../judging/schemas';
import * as z from 'zod';

describe('Layer2Analyzer', () => {
  let analyzer: Layer2Analyzer;
  let mockClient: MockEigenAIClient;

  beforeEach(() => {
    mockClient = new MockEigenAIClient();
    analyzer = new Layer2Analyzer(mockClient);
  });

  const createSubmission = (code: string): CodeSubmission => ({
    user_address: '0x1234567890123456789012345678901234567890',
    session_id: 'test-session',
    milestone_id: 1,
    code_files: [
      {
        file_path: 'test.ts',
        content: code,
        language: 'typescript'
      }
    ]
  });

  const createRubric = (): z.infer<typeof RubricSchema> => ({
    functionality_weight: 0.4,
    quality_weight: 0.3,
    best_practices_weight: 0.2,
    innovation_weight: 0.1
  });

  const createLayer1Result = (passed: boolean = true): Layer1Result => ({
    passed,
    syntax_errors: passed ? [] : ['Syntax error found'],
    structural_issues: [],
    security_violations: passed ? [] : ['Security violation'],
    file_count: 1,
    line_count: 10,
    ast_hash: 'abc123'
  });

  describe('analyze', () => {
    it('should analyze code and return Layer2 result', async () => {
      const code = `
        interface User {
          name: string;
          age: number;
        }
        
        function greet(user: User): string {
          try {
            return \`Hello, \${user.name}\`;
          } catch (error) {
            console.error(error);
            return '';
          }
        }
      `;

      const result = await analyzer.analyze(
        createSubmission(code),
        createRubric(),
        createLayer1Result(),
        12345
      );

      expect(result.functionality_score).toBeGreaterThanOrEqual(0);
      expect(result.functionality_score).toBeLessThanOrEqual(100);
      expect(result.quality_score).toBeGreaterThanOrEqual(0);
      expect(result.quality_score).toBeLessThanOrEqual(100);
      expect(result.best_practices_score).toBeGreaterThanOrEqual(0);
      expect(result.best_practices_score).toBeLessThanOrEqual(100);
      expect(result.innovation_score).toBeGreaterThanOrEqual(0);
      expect(result.innovation_score).toBeLessThanOrEqual(100);
      expect(result.feedback).toBeDefined();
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should penalize functionality score when Layer1 fails', async () => {
      const code = 'function test() { return 1; }';
      const layer1Failed = createLayer1Result(false);

      const result = await analyzer.analyze(
        createSubmission(code),
        createRubric(),
        layer1Failed,
        12345
      );

      const functionalityScore = result.functionality_score;
      expect(functionalityScore).toBeLessThan(100);
    });

    it('should penalize functionality score for security violations', async () => {
      const code = 'function test() { return 1; }';
      const layer1WithSecurityIssues: Layer1Result = {
        ...createLayer1Result(),
        passed: false,
        security_violations: ['eval() detected', 'localStorage for password']
      };

      const result = await analyzer.analyze(
        createSubmission(code),
        createRubric(),
        layer1WithSecurityIssues,
        12345
      );

      expect(result.functionality_score).toBeLessThan(100);
    });

    it('should penalize functionality score for syntax errors', async () => {
      const code = 'function test() { return 1; }';
      const layer1WithSyntaxErrors: Layer1Result = {
        ...createLayer1Result(),
        passed: false,
        syntax_errors: ['Unmatched braces', 'Missing semicolon']
      };

      const result = await analyzer.analyze(
        createSubmission(code),
        createRubric(),
        layer1WithSyntaxErrors,
        12345
      );

      expect(result.functionality_score).toBeLessThan(100);
    });

    it('should calculate weighted score using rubric weights', async () => {
      const code = 'function test() { return 1; }';

      const result = await analyzer.analyze(
        createSubmission(code),
        createRubric(),
        createLayer1Result(),
        12345
      );

      const expectedWeighted = Math.round(
        result.functionality_score * 0.4 +
        result.quality_score * 0.3 +
        result.best_practices_score * 0.2 +
        result.innovation_score * 0.1
      );

      expect(result.weighted_score).toBe(expectedWeighted);
    });

    it('should limit suggestions to 10 items', async () => {
      const code = 'function test() { return 1; }';

      const result = await analyzer.analyze(
        createSubmission(code),
        createRubric(),
        createLayer1Result(),
        12345
      );

      expect(result.suggestions.length).toBeLessThanOrEqual(10);
    });

    it('should combine feedback from all analysis categories', async () => {
      const code = 'function test() { return 1; }';

      const result = await analyzer.analyze(
        createSubmission(code),
        createRubric(),
        createLayer1Result(),
        12345
      );

      expect(result.feedback.length).toBeGreaterThan(0);
      expect(result.feedback).toContain('Score');
    });
  });

  describe('MockEigenAIClient', () => {
    let mockClient: MockEigenAIClient;

    beforeEach(() => {
      mockClient = new MockEigenAIClient();
    });

    it('should return valid score between 0 and 100', async () => {
      const result = await mockClient.analyze('function test() {}', 'Evaluate', 12345);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should return non-empty feedback', async () => {
      const result = await mockClient.analyze('function test() {}', 'Evaluate', 12345);

      expect(result.feedback).toBeDefined();
      expect(result.feedback.length).toBeGreaterThan(0);
    });

    it('should return array of suggestions', async () => {
      const result = await mockClient.analyze('function test() {}', 'Evaluate', 12345);

      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should be deterministic - same code and seed produce same result', async () => {
      const code = 'function test() { return 1; }';
      const prompt = 'Evaluate this code';
      const seed = 12345;

      const result1 = await mockClient.analyze(code, prompt, seed);
      const result2 = await mockClient.analyze(code, prompt, seed);

      expect(result1.score).toBe(result2.score);
      expect(result1.feedback).toBe(result2.feedback);
    });

    it('should produce different results for different seeds', async () => {
      const code = 'function test() { return 1; }';
      const prompt = 'Evaluate this code';

      const result1 = await mockClient.analyze(code, prompt, 12345);
      const result2 = await mockClient.analyze(code, prompt, 54321);

      expect(result1.score).not.toBe(result2.score);
    });

    it('should reward code with comments', async () => {
      const codeWithComments = `
        // This is a test function
        function test() {
          return 1;
        }
      `;

      const codeWithoutComments = 'function test() { return 1; }';

      const resultWith = await mockClient.analyze(codeWithComments, 'Evaluate', 12345);
      const resultWithout = await mockClient.analyze(codeWithoutComments, 'Evaluate', 12345);

      expect(resultWith.score).toBeGreaterThan(resultWithout.score);
    });

    it('should reward code with error handling', async () => {
      const codeWithErrorHandling = `
        function test() {
          try {
            return 1;
          } catch (error) {
            return 0;
          }
        }
      `;

      const codeWithoutErrorHandling = 'function test() { return 1; }';

      const resultWith = await mockClient.analyze(codeWithErrorHandling, 'Evaluate', 12345);
      const resultWithout = await mockClient.analyze(codeWithoutErrorHandling, 'Evaluate', 12345);

      expect(resultWith.score).toBeGreaterThan(resultWithout.score);
    });

    it('should reward code with TypeScript types', async () => {
      const codeWithTypes = `
        function test(x: number): number {
          return x + 1;
        }
      `;

      const codeWithoutTypes = `
        function test(x) {
          return x + 1;
        }
      `;

      const resultWith = await mockClient.analyze(codeWithTypes, 'Evaluate', 12345);
      const resultWithout = await mockClient.analyze(codeWithoutTypes, 'Evaluate', 12345);

      expect(resultWith.score).toBeGreaterThan(resultWithout.score);
    });

    it('should reward code with tests', async () => {
      const codeWithTests = `
        function test() { return 1; }
        
        describe('test', () => {
          it('should return 1', () => {
            expect(test()).toBe(1);
          });
        });
      `;

      const codeWithoutTests = 'function test() { return 1; }';

      const resultWith = await mockClient.analyze(codeWithTests, 'Evaluate', 12345);
      const resultWithout = await mockClient.analyze(codeWithoutTests, 'Evaluate', 12345);

      expect(resultWith.score).toBeGreaterThan(resultWithout.score);
    });

    it('should reward modern ES6+ patterns', async () => {
      const codeModern = `
        const arr = [1, 2, 3];
        const doubled = arr.map(x => x * 2);
        const filtered = arr.filter(x => x > 1);
      `;

      const codeLegacy = `
        var arr = [1, 2, 3];
        var doubled = [];
        for (var i = 0; i < arr.length; i++) {
          doubled.push(arr[i] * 2);
        }
      `;

      const resultModern = await mockClient.analyze(codeModern, 'Evaluate', 12345);
      const resultLegacy = await mockClient.analyze(codeLegacy, 'Evaluate', 12345);

      expect(resultModern.score).toBeGreaterThan(resultLegacy.score);
    });

    it('should provide suggestions for missing comments', async () => {
      const codeWithoutComments = 'function test() { return 1; }';

      const result = await mockClient.analyze(codeWithoutComments, 'Evaluate', 12345);

      expect(result.suggestions.some(s => s.includes('comment'))).toBe(true);
    });

    it('should provide suggestions for missing error handling', async () => {
      const codeWithoutErrorHandling = 'function test() { return 1; }';

      const result = await mockClient.analyze(codeWithoutErrorHandling, 'Evaluate', 12345);

      expect(result.suggestions.some(s => s.includes('error handling'))).toBe(true);
    });

    it('should provide suggestions for missing types', async () => {
      const codeWithoutTypes = 'function test(x) { return x + 1; }';

      const result = await mockClient.analyze(codeWithoutTypes, 'Evaluate', 12345);

      expect(result.suggestions.some(s => s.includes('type'))).toBe(true);
    });

    it('should simulate latency based on seed', async () => {
      const seed = 100;
      const startTime = Date.now();

      await mockClient.analyze('function test() {}', 'Evaluate', seed);

      const endTime = Date.now();
      const delay = endTime - startTime;

      expect(delay).toBeGreaterThanOrEqual(100);
      expect(delay).toBeLessThan(600);
    });
  });
});
