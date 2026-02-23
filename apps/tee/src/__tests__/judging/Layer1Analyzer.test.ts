import { Layer1Analyzer } from '../../judging/layers/Layer1Analyzer';
import { CodeSubmission } from '../../judging/schemas';

describe('Layer1Analyzer', () => {
  let analyzer: Layer1Analyzer;

  const createSubmission = (content: string, language: string = 'typescript', filePath: string = 'test.ts'): CodeSubmission => ({
    user_address: '0x1234567890123456789012345678901234567890',
    session_id: 'test-session',
    milestone_id: 1,
    code_files: [
      {
        file_path: filePath,
        content,
        language
      }
    ]
  });

  beforeEach(() => {
    analyzer = new Layer1Analyzer();
  });

  describe('analyze', () => {
    it('should pass clean TypeScript code', async () => {
      const code = `
        interface User {
          name: string;
          age: number;
        }
        
        function greet(user: User): string {
          return \`Hello, \${user.name}\`;
        }
      `;

      const result = await analyzer.analyze(createSubmission(code));

      expect(result.passed).toBe(true);
      expect(result.syntax_errors).toHaveLength(0);
      expect(result.security_violations).toHaveLength(0);
      expect(result.file_count).toBe(1);
    });

    it('should detect eval() security violation', async () => {
      const result = await analyzer.analyze(createSubmission('const result = eval(userInput);'));

      expect(result.passed).toBe(false);
      expect(result.security_violations).toHaveLength(1);
      expect(result.security_violations[0]).toContain('eval()');
    });

    it('should detect dangerouslySetInnerHTML security violation', async () => {
      const code = 'const div = <div dangerouslySetInnerHTML={{ __html: html }} />;';
      const result = await analyzer.analyze(createSubmission(code, 'typescript', 'xss.tsx'));

      expect(result.passed).toBe(false);
      expect(result.security_violations.some(v => v.includes('dangerouslySetInnerHTML'))).toBe(true);
    });

    it('should detect localStorage sensitive data storage', async () => {
      const result = await analyzer.analyze(createSubmission('localStorage.setItem("password", userPassword);'));

      expect(result.passed).toBe(false);
      expect(result.security_violations.some(v => v.includes('localStorage') && v.includes('password'))).toBe(true);
    });

    it('should detect Math.random() usage (not cryptographically secure)', async () => {
      const result = await analyzer.analyze(createSubmission('const nonce = Math.random();'));

      expect(result.security_violations.some(v => v.includes('Math.random()'))).toBe(true);
    });

    it('should detect TODO/FIXME comments', async () => {
      const code = `
        // TODO: Implement this function
        function incomplete() {
          // FIXME: Fix this bug
          return null;
        }
      `;

      const result = await analyzer.analyze(createSubmission(code));

      expect(result.syntax_errors.length).toBeGreaterThan(0);
      expect(result.syntax_errors.some(e => e.includes('TODO') || e.includes('FIXME'))).toBe(true);
    });

    it('should detect wildcard imports', async () => {
      const result = await analyzer.analyze(createSubmission("import * as utils from '../utils';"));

      expect(result.syntax_errors.some(e => e.includes('Wildcard import'))).toBe(true);
    });

    it('should detect @ts-ignore usage', async () => {
      const code = `
        // @ts-ignore
        const x: any = 5;
      `;

      const result = await analyzer.analyze(createSubmission(code));

      expect(result.structural_issues.some(i => i.includes('@ts-ignore'))).toBe(true);
    });

    it('should detect console statements', async () => {
      const code = `
        console.log('Debug info');
        console.error('Error occurred');
        console.warn('Warning message');
      `;

      const result = await analyzer.analyze(createSubmission(code));

      expect(result.structural_issues.filter(i => i.includes('Console'))).toHaveLength(3);
    });

    it('should detect "any" type usage', async () => {
      const code = `
        const data: any = {};
        function process(input: any): void {
          console.log(input);
        }
      `;

      const result = await analyzer.analyze(createSubmission(code));

      expect(result.structural_issues.some(i => i.includes('any'))).toBe(true);
    });

    it('should detect unmatched braces', async () => {
      const result = await analyzer.analyze(createSubmission('function test() { console.log("hello");'));

      expect(result.syntax_errors.some(e => e.includes('Unmatched braces'))).toBe(true);
      expect(result.passed).toBe(false);
    });

    it('should count files and lines correctly', async () => {
      const code1 = 'line1\nline2\nline3';
      const code2 = 'line1\nline2\nline3\nline4\nline5';

      const submission: CodeSubmission = {
        user_address: '0x1234567890123456789012345678901234567890',
        session_id: 'test-session',
        milestone_id: 1,
        code_files: [
          { file_path: 'file1.ts', content: code1, language: 'typescript' },
          { file_path: 'file2.ts', content: code2, language: 'typescript' }
        ]
      };

      const result = await analyzer.analyze(submission);

      expect(result.file_count).toBe(2);
      expect(result.line_count).toBe(8);
    });

    it('should generate unique AST hash for different code', async () => {
      const result1 = await analyzer.analyze(createSubmission('function test() { return 1; }'));
      const result2 = await analyzer.analyze(createSubmission('function test() { return 2; }'));

      expect(result1.ast_hash).not.toBe(result2.ast_hash);
    });

    it('should generate same AST hash for identical code', async () => {
      const code = 'function test() { return 1; }';
      const result1 = await analyzer.analyze(createSubmission(code));
      const result2 = await analyzer.analyze(createSubmission(code));

      expect(result1.ast_hash).toBe(result2.ast_hash);
    });

    it('should handle multiple security violations', async () => {
      const code = `
        const result = eval(code);
        localStorage.setItem("token", token);
        document.write(content);
      `;

      const result = await analyzer.analyze(createSubmission(code));

      expect(result.security_violations.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle non-TypeScript files', async () => {
      const result = await analyzer.analyze(createSubmission(
        'def hello():\n    print("Hello, World!")',
        'python',
        'test.py'
      ));

      expect(result.file_count).toBe(1);
      expect(result.line_count).toBe(2);
    });

    it('should handle empty submission', async () => {
      const submission: CodeSubmission = {
        user_address: '0x1234567890123456789012345678901234567890',
        session_id: 'test-session',
        milestone_id: 1,
        code_files: []
      };

      const result = await analyzer.analyze(submission);

      expect(result.file_count).toBe(0);
      expect(result.line_count).toBe(0);
      expect(result.passed).toBe(true);
    });

    it('should include file path in error messages', async () => {
      const result = await analyzer.analyze(createSubmission(
        'eval(userInput);',
        'typescript',
        'src/components/Button.tsx'
      ));

      expect(result.security_violations[0]).toContain('src/components/Button.tsx');
    });
  });
});
