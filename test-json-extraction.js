// Test script for robust JSON extraction

const testCases = [
  {
    name: 'Clean JSON from Qwen',
    input: '{"project_type": "application", "tech_stack": {"framework": "None"}}',
    expected: { project_type: 'application', tech_stack: { framework: 'None' } }
  },
  {
    name: 'JSON with channel tags',
    input: '<|channel|>analysis<|message|>We need to output JSON<|end|>{"project_type": "app"}',
    expected: { project_type: 'app' }
  },
  {
    name: 'JSON in markdown code block',
    input: '```json\n{"project_type": "component"}\n```',
    expected: { project_type: 'component' }
  },
  {
    name: 'JSON with unquoted step IDs',
    input: '{"previous_steps": [3, 4_1]}',
    expected: { previous_steps: [3, '4_1'] }
  },
  {
    name: 'JSON with trailing commas',
    input: '{"project_type": "app", "modules": [],}',
    expected: { project_type: 'app', modules: [] }
  },
  {
    name: 'JSON with text before and after',
    input: 'Here is the JSON you requested:\n{"project_type": "feature"}\nHope this helps!',
    expected: { project_type: 'feature' }
  },
  {
    name: 'Complex nested JSON',
    input: '{"phases": [{"phase_number": 1, "key_concepts": ["Solidity", "Modifiers"]}, {"phase_number": 2}]}',
    expected: { phases: [{ phase_number: 1, key_concepts: ['Solidity', 'Modifiers'] }, { phase_number: 2 }] }
  }
];

// Minimal sanitize function (from EigenAIProvider)
function minimalSanitize(json) {
  // 1. Remove trailing commas before } or ]
  json = json.replace(/,(?=\s*[}\]])/g, '');
  
  // 2. Fix unquoted step IDs ONLY in previous_steps arrays
  json = json.replace(/("previous_steps"\s*:\s*\[)([^\]]+)\]/g, (match, prefix, content) => {
    const fixedContent = content.replace(/(\d+)_(\d+)/g, '"$1_$2"');
    return prefix + fixedContent + ']';
  });
  
  // 3. Remove control characters
  json = json.replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F]/g, '');
  
  // 4. Fix smart quotes
  json = json
    .replace(/"/g, '"')
    .replace(/"/g, '"');
  
  // 5. Fix unicode hyphens
  json = json
    .replace(/ÔÇæ/g, '-')
    .replace(/ÔÇö/g, '-')
    .replace(/ÔÇô/g, '-');
  
  return json;
}

// Robust JSON extraction function
function extractAndParseJSON(raw) {
  let jsonContent = raw;
  
  // Step 1: Remove channel tags if present
  const endMarker = '<|end|>';
  const endMarkerIndex = jsonContent.lastIndexOf(endMarker);
  if (endMarkerIndex !== -1) {
    jsonContent = jsonContent.substring(endMarkerIndex + endMarker.length);
  }

  // Step 2: Try to extract JSON from markdown code blocks
  const codeBlockMatch = jsonContent.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonContent = codeBlockMatch[1].trim();
  }

  // Step 3: Find JSON object boundaries using BRACE COUNTING
  const firstBrace = jsonContent.indexOf('{');
  const lastBrace = jsonContent.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    let candidate = jsonContent.substring(firstBrace, lastBrace + 1);
    
    // Try parse as-is first
    try {
      return JSON.parse(candidate);
    } catch (initialError) {
      console.log('  Initial parse failed, applying minimal sanitization...');
      
      // Only apply minimal fixes if raw parse fails
      candidate = minimalSanitize(candidate);
      
      try {
        return JSON.parse(candidate);
      } catch (e) {
        throw new Error(`JSON parse failed: ${e.message}`);
      }
    }
  }
  
  // Fallback: try parse entire string
  return JSON.parse(jsonContent.trim());
}

// Run tests
console.log('🧪 Testing Robust JSON Extraction\n');
console.log('=' .repeat(60));

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
  console.log(`\nTest: ${testCase.name}`);
  console.log('-'.repeat(60));
  console.log(`Input: ${testCase.input.substring(0, 80)}${testCase.input.length > 80 ? '...' : ''}`);
  
  try {
    const result = extractAndParseJSON(testCase.input);
    const resultStr = JSON.stringify(result);
    const expectedStr = JSON.stringify(testCase.expected);
    
    if (resultStr === expectedStr) {
      console.log(`✅ PASS`);
      console.log(`Output: ${resultStr.substring(0, 80)}${resultStr.length > 80 ? '...' : ''}`);
      passed++;
    } else {
      console.log(`❌ FAIL - Result doesn't match expected`);
      console.log(`Expected: ${expectedStr}`);
      console.log(`Got: ${resultStr}`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ FAIL - ${error.message}`);
    console.log(`Input was: ${testCase.input}`);
    failed++;
  }
}

console.log('\n' + '='.repeat(60));
console.log(`\nResults: ${passed} passed, ${failed} failed`);
console.log(`Success rate: ${((passed / testCases.length) * 100).toFixed(1)}%`);

if (failed === 0) {
  console.log('\n🎉 All tests passed!');
  process.exit(0);
} else {
  console.log('\n❌ Some tests failed. Need to fix extraction logic.');
  process.exit(1);
}
