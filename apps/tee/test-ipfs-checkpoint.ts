/**
 * Test checkpoint creation with code snapshot
 */

import axios from 'axios';
import { ethers } from 'ethers';

const TEE_SERVER_URL = 'http://localhost:3001';

interface SessionResponse {
  sessionId: string;
}

interface CheckpointResponse {
  success: boolean;
  checkpoint: {
    milestoneId: number;
    score: number;
    ipfsHash: string;
    timestamp: string;
  };
}

async function testCheckpointWithCode() {
  console.log('=== Checkpoint with Code Snapshot Test ===\n');

  try {
    const testCodeFiles = {
      files: [
        {
          path: 'src/App.tsx',
          content: `import React, { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Test App</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}

export default App;`
        },
        {
          path: 'src/utils.ts',
          content: `export const formatNumber = (n: number): string => {
  return n.toLocaleString();
};`
        }
      ],
      dependencies: ['react', 'react-dom'],
      metadata: {
        sessionId: 'test-session',
        timestamp: Date.now(),
        fileCount: 2
      }
    };

    console.log('📝 Creating checkpoint with code files...');
    
    const checkpointResponse = await axios.post<CheckpointResponse>(
      `${TEE_SERVER_URL}/checkpoint/create`,
      {
        sessionId: 'test-session-123',
        milestoneId: 3,
        codeFiles: testCodeFiles
      }
    );

    if (checkpointResponse.status !== 200) {
      throw new Error(`Checkpoint creation failed: ${checkpointResponse.status}`);
    }

    const checkpoint = checkpointResponse.data.checkpoint;
    console.log(`✅ Checkpoint created`);
    console.log(`   Milestone: ${checkpoint.milestoneId}`);
    console.log(`   Score: ${checkpoint.score}`);
    console.log(`   IPFS Hash: ${checkpoint.ipfsHash}`);
    
    if (checkpoint.ipfsHash) {
      console.log(`   Gateway URL: https://gateway.pinata.cloud/ipfs/${checkpoint.ipfsHash}\n`);

      console.log('📝 Retrieving checkpoint from IPFS...');
      const retrievalResponse = await axios.get(
        `${TEE_SERVER_URL}/checkpoint/test-session-123/3`
      );

      if (retrievalResponse.status !== 200) {
        throw new Error(`Retrieval failed: ${retrievalResponse.status}`);
      }

      const retrievedData = retrievalResponse.data;
      console.log('✅ Retrieval successful!');
      console.log(`   Retrieved files count: ${retrievedData.snapshot?.files?.length || 0}`);

      if (retrievedData.snapshot?.files) {
        console.log('   Files:');
        retrievedData.snapshot.files.forEach((file: any, idx: number) => {
          console.log(`     ${idx + 1}. ${file.path} (${file.content?.length || 0} chars)`);
        });
      }

      const dataMatch = 
        retrievedData.snapshot?.files?.[0]?.content?.includes('React, { useState }') &&
        retrievedData.snapshot?.files?.[1]?.content?.includes('formatNumber');
      
      console.log(`\nData integrity check: ${dataMatch ? '✅ PASS' : '❌ FAIL'}`);
    } else {
      console.log('⚠️  No IPFS hash in checkpoint response');
    }

    return {
      success: true,
      checkpoint,
      retrievedSnapshot: checkpoint.ipfsHash ? retrievalResponse.data.snapshot : null
    };
  } catch (error) {
    console.error('\n❌ Checkpoint Test Failed');
    console.error(`Error: ${(error as Error).message}`);
    if ((error as any).response?.data) {
      console.error(`Server Response:`, (error as any).response.data);
    }
    process.exit(1);
  }
}

testCheckpointWithCode();
