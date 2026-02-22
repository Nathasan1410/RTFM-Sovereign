import { JudgingEngine } from './src/judging/JudgingEngine';
import { v4 as uuidv4 } from 'uuid';

const judgingEngine = new JudgingEngine({
  enableCache: false,
  useMockEigenAI: true
});

async function runJudgingTests() {
  console.log('🧪 Starting AI Judging Engine Tests (Chunk 2)\n');

  const testCases = [
    {
      name: 'Test A: Syntax Error (Unmatched Braces)',
      code: `export function Card() {
  return (
    <div className="card">
      <h2>Product Review</h2>
      <p>5/5 stars</p>
    </div>
  // Missing closing brace!
}`,
      expectedPass: false,
      expectedErrors: ['Unmatched']
    },
    {
      name: 'Test B: Security Violation (eval + localStorage)',
      code: `import { useEffect } from 'react';

export function DangerousCard() {
  useEffect(() => {
    const userData = eval(getUserDataFromURL());
    localStorage.setItem('password', userData.password);
    document.write(userData.secret);
  }, []);

  return <div>Dangerous Component</div>;
}`,
      expectedPass: false,
      expectedErrors: ['security', 'eval', 'localStorage', 'document.write']
    },
    {
      name: 'Test C: Incomplete Implementation (TODO comments)',
      code: `export interface CardProps {
  title: string;
  rating: number;
}

export function Card(props: CardProps) {
  // TODO: Implement error handling
  // FIXME: Add loading state
  
  function renderRating() {
    // TODO: Handle edge cases
    if (props.rating > 5) {
      return 'Invalid';
    }
    return '⭐'.repeat(props.rating);
  }

  return (
    <div className="card">
      <h2>{props.title}</h2>
      <p>{renderRating()}</p>
      {/* XXX: Add review text */}
    </div>
  );
}`,
      expectedPass: false,
      expectedErrors: ['TODO', 'FIXME', 'XXX']
    },
    {
      name: 'Test D: Excellent Implementation',
      code: `import React, { useState, useEffect } from 'react';

export interface CardProps {
  title: string;
  rating: number;
  reviewText?: string;
}

export function ProductCard({ title, rating, reviewText }: CardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (rating < 0 || rating > 5) {
        throw new Error('Invalid rating');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [rating]);

  const renderStars = () => {
    const stars = Math.min(Math.max(rating, 0), 5);
    return '⭐'.repeat(Math.floor(stars));
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="product-card">
      <h2>{title}</h2>
      <div className="rating">{renderStars()}</div>
      {reviewText && <p className="review">{reviewText}</p>}
    </div>
  );
}

export default ProductCard;`,
      expectedPass: true,
      expectedErrors: []
    },
    {
      name: 'Test E: Continuity Testing (Multiple Files)',
      code: [
        {
          file_path: 'src/components/Card.tsx',
          content: `import React from 'react';
import { CardProps } from '../types/card';
import { useCardLogic } from '../hooks/useCardLogic';

export function Card({ title, rating }: CardProps) {
  const { renderStars, handleClick } = useCardLogic(rating);
  
  return (
    <div className="card" onClick={handleClick}>
      <h2>{title}</h2>
      <div className="rating">{renderStars()}</div>
    </div>
  );
}`
        },
        {
          file_path: 'src/types/card.ts',
          content: `export interface CardProps {
  title: string;
  rating: number;
  onClick?: () => void;
}

export interface CardState {
  isActive: boolean;
}`
        },
        {
          file_path: 'src/hooks/useCardLogic.ts',
          content: `import { useState } from 'react';
import { CardProps } from '../types/card';

export function useCardLogic(rating: number) {
  const [isActive, setIsActive] = useState(false);

  const renderStars = () => {
    const stars = Math.min(Math.max(rating, 0), 5);
    return '⭐'.repeat(Math.floor(stars));
  };

  const handleClick = () => {
    setIsActive(!isActive);
  };

  return { renderStars, handleClick, isActive };
}`
        }
      ],
      expectedPass: true,
      expectedErrors: []
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Running: ${testCase.name}`);
    console.log('='.repeat(60));

    try {
      const sessionId = uuidv4();
      const codeFiles = Array.isArray(testCase.code)
        ? testCase.code
        : [{
            file_path: 'src/components/Card.tsx',
            content: testCase.code,
            language: 'typescript'
          }];

      const result = await judgingEngine.judge({
        submission: {
          user_address: '0xTestUser',
          session_id: sessionId,
          milestone_id: 1,
          code_files: codeFiles
        },
        seed: 12345
      });

      console.log(`\nResult: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(`Overall Score: ${result.overall_score}/100`);
      console.log(`\n--- Layer 1 (Structural Analysis) ---`);
      console.log(`Passed: ${result.layer1_result.passed}`);
      console.log(`Syntax Errors: ${result.layer1_result.syntax_errors.length}`);
      console.log(`Security Violations: ${result.layer1_result.security_violations.length}`);
      console.log(`Structural Issues: ${result.layer1_result.structural_issues.length}`);

      if (result.layer1_result.syntax_errors.length > 0) {
        console.log(`Syntax Errors:`);
        result.layer1_result.syntax_errors.forEach(e => console.log(`  - ${e}`));
      }

      if (result.layer1_result.security_violations.length > 0) {
        console.log(`Security Violations:`);
        result.layer1_result.security_violations.forEach(e => console.log(`  - ${e}`));
      }

      console.log(`\n--- Layer 2 (Semantic Review) ---`);
      console.log(`Functionality: ${result.layer2_result.functionality_score}/100`);
      console.log(`Quality: ${result.layer2_result.quality_score}/100`);
      console.log(`Best Practices: ${result.layer2_result.best_practices_score}/100`);
      console.log(`Innovation: ${result.layer2_result.innovation_score}/100`);
      console.log(`\nFeedback: ${result.layer2_result.feedback}`);

      const testPassed = 
        result.passed === testCase.expectedPass &&
        (testCase.expectedErrors.length === 0 || 
         testCase.expectedErrors.some(err => 
           result.layer1_result.syntax_errors.some(se => se.toLowerCase().includes(err.toLowerCase())) ||
           result.layer1_result.security_violations.some(sv => sv.toLowerCase().includes(err.toLowerCase())) ||
           result.layer1_result.structural_issues.some(si => si.toLowerCase().includes(err.toLowerCase()))
         ));

      if (testPassed) {
        console.log(`\n✅ Test Case PASSED`);
        passed++;
      } else {
        console.log(`\n❌ Test Case FAILED`);
        console.log(`Expected pass: ${testCase.expectedPass}, Got: ${result.passed}`);
        failed++;
      }

    } catch (error) {
      console.log(`\n❌ Test Case ERROR: ${(error as Error).message}`);
      failed++;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Test Summary: ${passed}/${testCases.length} passed, ${failed} failed`);
  console.log('='.repeat(60));

  return passed === testCases.length;
}

runJudgingTests()
  .then(success => {
    console.log(`\n${success ? '🎉 All tests passed!' : '⚠️ Some tests failed!'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(console.error);
