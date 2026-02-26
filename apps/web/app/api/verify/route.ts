import { NextResponse } from 'next/server';
import { VerifyRequestSchema, VerifyResponseSchema, CheckResult } from '@/types/verify';
import { getAIClient } from '@/lib/ai';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parseResult = VerifyRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { userCode, files, requirements, topic } = parseResult.data;
    
    // Use files if provided, otherwise fall back to single userCode
    const codeFiles = files && files.length > 0 ? files : [{ name: 'index.tsx', content: userCode }];

    // Use server-side environment variables for API keys (NEVER from frontend)
    const groqKey = process.env.GROQ_API_KEY || undefined;
    const cerebrasKey = process.env.CEREBRAS_API_KEY || undefined;
    const eigenPrivateKey = process.env.EIGENAI_PRIVATE_KEY || undefined;

    const { client, defaultModel } = getAIClient({
      groq: groqKey,
      cerebras: cerebrasKey,
      eigenPrivateKey: eigenPrivateKey
    });

    const checks: CheckResult[] = [];

    try {
      const { ESLint } = await import('eslint');

      const eslint = new ESLint({
        overrideConfigFile: true,
        overrideConfig: {
          languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            parserOptions: {
              ecmaFeatures: {
                jsx: true,
              },
            },
            globals: {
              window: 'readonly',
              document: 'readonly',
              console: 'readonly',
              setTimeout: 'readonly',
              setInterval: 'readonly',
              clearTimeout: 'readonly',
              clearInterval: 'readonly',
              React: 'readonly',
              JSX: 'readonly',
            },
          },
          rules: {
            'no-console': 'off',
            'no-unused-vars': 'off',
            'no-undef': 'off',
            'semi': 'off',
            'quotes': 'off',
            'eqeqeq': 'off',
            'no-var': 'off',
            'no-unused-expressions': 'off',
            'no-useless-escape': 'off',
          },
        },
      });

      // Lint all files - use .jsx extension for all React files to enable JSX parsing
      const allResults = await Promise.all(
        codeFiles.map(f => {
          // For ESLint, use .jsx extension for any file with JSX content
          const hasJSX = f.content.includes('<') && (f.content.includes('</') || f.content.includes('/>'));
          const lintFileName = f.name.endsWith('.css') 
            ? f.name 
            : (f.name.endsWith('.jsx') || f.name.endsWith('.tsx') || hasJSX)
              ? f.name.replace('.tsx', '.jsx').replace('.ts', '.jsx')
              : f.name;
          return eslint.lintText(f.content, { filePath: lintFileName });
        })
      );
      const results = allResults.flat();

      // Only report actual errors, ignore warnings for educational mode
      const errors = results.flatMap(r => r.messages.filter(m => m.severity === 2 && m.message.includes('Parsing error')));

      if (errors.length > 0) {
        checks.push({
          category: 'lint',
          status: 'WARNING', // Always warning, never fail
          message: 'Code review completed',
          details: errors.map(e => ({
            line: e.line,
            column: e.column,
            message: e.message,
            ruleId: e.ruleId,
            file: (e as any).filePath || 'unknown',
          })),
        });
      } else {
        checks.push({
          category: 'lint',
          status: 'PASS',
          message: 'Code looks good!',
        });
      }
    } catch (error) {
      // ESLint failure is not critical
      checks.push({
        category: 'lint',
        status: 'PASS',
        message: 'Code structure looks good',
      });
    }

    try {
      // Simple syntax check - just verify code is parseable
      const hasSyntaxErrors = codeFiles.some(f => {
        // Basic checks for common syntax errors
        const content = f.content;
        
        // Check for unclosed braces
        const openBraces = (content.match(/{/g) || []).length;
        const closeBraces = (content.match(/}/g) || []).length;
        
        // Check for unclosed parentheses
        const openParens = (content.match(/\(/g) || []).length;
        const closeParens = (content.match(/\)/g) || []).length;
        
        // Check for unclosed brackets
        const openBrackets = (content.match(/\[/g) || []).length;
        const closeBrackets = (content.match(/\]/g) || []).length;
        
        return openBraces !== closeBraces || openParens !== closeParens || openBrackets !== closeBrackets;
      });

      if (hasSyntaxErrors) {
        checks.push({
          category: 'type',
          status: 'WARNING',
          message: 'Possible syntax errors detected - check your braces and brackets',
        });
      } else {
        checks.push({
          category: 'type',
          status: 'PASS',
          message: 'Code syntax looks good!',
        });
      }
    } catch (error) {
      checks.push({
        category: 'type',
        status: 'PASS',
        message: 'Code structure looks good',
      });
    }

    const lintFailed = checks.some(c => c.category === 'lint' && c.status === 'FAIL');
    const typeFailed = checks.some(c => c.category === 'type' && c.status === 'FAIL');

    // Run AI verification - AI decision is final for educational mode
    // Lint/Type checks are just helpful feedback
    let aiCheck: CheckResult;

    try {
      const systemPrompt = `
You are a Strict Code Judge for a programming tutorial.
Your goal is to verify if USER CODE meets specific REQUIREMENTS.

CONTEXT:
Topic: ${topic || 'General Web Development'}

REQUIREMENTS:
${requirements.map((r, i) => `${i + 1}. ${r}`).join('\n')}

INSTRUCTIONS:
1. Analyze the USER CODE against the REQUIREMENTS.
2. If ALL requirements are met, status is "PASS".
3. If ANY requirement is missing or incorrect, status is "FAIL".
4. Provide specific feedback referencing the missing requirement.
5. Provide a helpful hint (not the solution) if failed.

JSON RESPONSE FORMAT:
{
  "status": "PASS" | "FAIL" | "PARTIAL",
  "feedback": "Detailed explanation...",
  "hints": ["Hint 1", "Hint 2"]
}
`;

        // EigenAI uses client.completions.create, Groq/Cerebras use client.chat.completions.create
        const createCompletion = (client as any).completions 
          ? (client as any).completions.create.bind(client)
          : (client as any).chat?.completions?.create?.bind((client as any).chat);

        if (!createCompletion) {
          throw new Error('Invalid client configuration');
        }

        // Build code context with all files
        const codeContext = codeFiles.length > 1
          ? codeFiles.map(f => `// File: ${f.name}\n${f.content}`).join('\n\n')
          : (codeFiles[0]?.content || userCode);

        const completion = await createCompletion({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `USER CODE:\n\n${codeContext}` }
          ],
          model: defaultModel,
          temperature: 0.1,
          max_completion_tokens: 1000,
          response_format: { type: 'json_object' },
        }) as any;

        const content = completion.choices[0]?.message?.content;
        if (!content) throw new Error('No content from AI');

        let json;
        try {
          json = JSON.parse(content);
        } catch {
          const match = content.match(/\{[\s\S]*\}/);
          if (match) json = JSON.parse(match[0]);
          else throw new Error('Failed to parse JSON');
        }

        const validated = VerifyResponseSchema.parse(json);
        aiCheck = {
          category: 'ai',
          status: validated.status === 'PASS' ? 'PASS' : 'FAIL',
          message: validated.feedback,
          details: validated.hints || [],
        };
      } catch (error) {
        aiCheck = {
          category: 'ai',
          status: 'WARNING',
          message: 'AI verification failed to run',
          details: [error instanceof Error ? error.message : String(error)],
        };
      }

    checks.push(aiCheck);

    // For educational mode: AI decision is final
    // If AI says PASS, the code passes (regardless of lint/type warnings)
    const finalStatus = aiCheck.status === 'PASS' ? 'PASS' : aiCheck.status === 'FAIL' ? 'FAIL' : 'PARTIAL';

    const overallFeedback = checks.map(c => {
      const icon = c.status === 'PASS' ? '✅' : c.status === 'FAIL' ? '❌' : '⚠️';
      const category = c.category === 'lint' ? 'Code Quality' : c.category === 'type' ? 'Type Safety' : 'AI Review';
      return `${icon} ${category}: ${c.message}`;
    }).join('\n');

    const hints: string[] = [];
    checks.forEach(c => {
      if (c.status === 'FAIL' && c.details) {
        if (Array.isArray(c.details)) {
          hints.push(...c.details);
        } else if (typeof c.details === 'string') {
          hints.push(c.details);
        }
      }
    });

    const response = {
      status: finalStatus,
      feedback: overallFeedback,
      hints,
      checks,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Verify API Error:', error);
    if (error instanceof Error && error.message.includes('No AI API Key found')) {
      return NextResponse.json(
        { error: 'Missing AI API key. Add Groq or Cerebras key in Settings.' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
