import { Layer1ResultSchema, CodeSubmission } from '../schemas';

export class Layer1Analyzer {
  
  public async analyze(submission: CodeSubmission): Promise<z.infer<typeof Layer1ResultSchema>> {
    const syntaxErrors: string[] = [];
    const structuralIssues: string[] = [];
    const securityViolations: string[] = [];
    let totalLines = 0;

    for (const file of submission.code_files) {
      totalLines += file.content.split('\n').length;

      if (file.language === 'typescript' || file.language === 'javascript') {
        const analysis = this.analyzeTypeScript(file.content, file.file_path);
        syntaxErrors.push(...analysis.syntaxErrors);
        structuralIssues.push(...analysis.structuralIssues);
        securityViolations.push(...analysis.securityViolations);
      }
    }

    const passed = syntaxErrors.length === 0 && securityViolations.length === 0;
    const astHash = this.generateASTHash(submission.code_files);

    return Layer1ResultSchema.parse({
      passed,
      syntax_errors: syntaxErrors,
      structural_issues: structuralIssues,
      security_violations: securityViolations,
      file_count: submission.code_files.length,
      line_count: totalLines,
      ast_hash: astHash
    });
  }

  private analyzeTypeScript(code: string, filePath: string): {
    syntaxErrors: string[];
    structuralIssues: string[];
    securityViolations: string[];
  } {
    const syntaxErrors: string[] = [];
    const structuralIssues: string[] = [];
    const securityViolations: string[] = [];

    try {
      const patterns = [
        {
          type: 'security',
          regex: /eval\s*\(/gi,
          message: 'Use of eval() detected - potential security risk',
          file: filePath
        },
        {
          type: 'security',
          regex: /dangerouslySetInnerHTML\s*=/gi,
          message: 'dangerouslySetInnerHTML detected - XSS vulnerability risk',
          file: filePath
        },
        {
          type: 'security',
          regex: /innerHTML\s*=/gi,
          message: 'Direct innerHTML assignment - XSS vulnerability risk',
          file: filePath
        },
        {
          type: 'security',
          regex: /document\.write\s*\(/gi,
          message: 'document.write() detected - security concern',
          file: filePath
        },
        {
          type: 'security',
          regex: /localStorage\.setItem\s*\(\s*['"`](password|token|secret|api_key)['"`]/gi,
          message: 'Sensitive data stored in localStorage',
          file: filePath
        },
        {
          type: 'security',
          regex: /process\.env\./gi,
          message: 'Environment variable usage detected - ensure proper sanitization',
          file: filePath
        },
        {
          type: 'security',
          regex: /Math\.random\s*\(\)/gi,
          message: 'Math.random() used - not cryptographically secure',
          file: filePath
        },
        {
          type: 'structure',
          regex: /function\s*\(\s*\)\s*=>\s*\{[\s\S]{500,}\}/gi,
          message: 'Function too long (>500 chars) - consider refactoring',
          file: filePath
        },
        {
          type: 'structure',
          regex: /if\s*\([\s\S]{100,}\)/gi,
          message: 'Complex condition detected - consider simplifying',
          file: filePath
        },
        {
          type: 'structure',
          regex: /console\.(log|debug|warn|error)\s*\(/gi,
          message: 'Console statements detected - remove in production',
          file: filePath
        },
        {
          type: 'structure',
          regex: /any\s*(?=[,\)\]\}>])/gi,
          message: 'Type "any" used - prefer specific types',
          file: filePath
        },
        {
          type: 'structure',
          regex: /@ts-ignore/gi,
          message: '@ts-ignore detected - type checking disabled',
          file: filePath
        },
        {
          type: 'syntax',
          regex: /\/\/\s*TODO|\/\/\s*FIXME|\/\/\s*XXX/gi,
          message: 'TODO/FIXME comments found - complete the implementation',
          file: filePath
        },
        {
          type: 'syntax',
          regex: /import\s+.*from\s+['"`]\.?\.\.['"`]/gi,
          message: 'Wildcard import detected - prefer named imports',
          file: filePath
        }
      ];

      for (const pattern of patterns) {
        const matches = code.matchAll(pattern.regex);
        for (const match of matches) {
          const lineNum = code.substring(0, match.index).split('\n').length;
          const message = `${pattern.file}:${lineNum} - ${pattern.message}`;
          
          if (pattern.type === 'security') {
            securityViolations.push(message);
          } else if (pattern.type === 'structure') {
            structuralIssues.push(message);
          } else if (pattern.type === 'syntax') {
            syntaxErrors.push(message);
          }
        }
      }

      const unmatchedBraces = (code.match(/\{/g) || []).length - (code.match(/\}/g) || []).length;
      const unmatchedParens = (code.match(/\(/g) || []).length - (code.match(/\)/g) || []).length;
      const unmatchedBrackets = (code.match(/\[/g) || []).length - (code.match(/\]/g) || []).length;

      if (unmatchedBraces !== 0) syntaxErrors.push(`${filePath}: Unmatched braces detected`);
      if (unmatchedParens !== 0) syntaxErrors.push(`${filePath}: Unmatched parentheses detected`);
      if (unmatchedBrackets !== 0) syntaxErrors.push(`${filePath}: Unmatched brackets detected`);

    } catch (error) {
      syntaxErrors.push(`${filePath}: Error analyzing code - ${error}`);
    }

    return { syntaxErrors, structuralIssues, securityViolations };
  }

  private generateASTHash(files: Array<{ file_path: string; content: string }>): string {
    const combined = files
      .sort((a, b) => a.file_path.localeCompare(b.file_path))
      .map(f => `${f.file_path}:${f.content.length}:${this.calculateChecksum(f.content)}`)
      .join('|');
    
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  private calculateChecksum(content: string): number {
    let sum = 0;
    for (let i = 0; i < content.length; i++) {
      sum = ((sum << 5) - sum) + content.charCodeAt(i);
      sum = sum & sum;
    }
    return Math.abs(sum);
  }
}

import * as z from 'zod';
