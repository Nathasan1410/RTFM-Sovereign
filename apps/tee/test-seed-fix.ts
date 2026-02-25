import { keccak256, toUtf8Bytes } from 'ethers';

function computeSeed(userAddress: string, topic: string, attemptNumber: number): number {
  const seedString = `${userAddress}:${topic}:${attemptNumber}`;
  const seedHash = keccak256(toUtf8Bytes(seedString));
  let seedInt = parseInt(seedHash.substring(2, 10), 16);
  // EigenAI API has issues with seeds >= 3B, ensure safe range
  seedInt = seedInt % 1000000000;
  return seedInt;
}

console.log('Testing seed generation fix:\n');

const testCases = [
  ['0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48', 'Next.js App Router', 1],
  ['0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48', 'Solidity', 1],
  ['0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48', 'React', 2],
  ['0x1234567890123456789012345678901234567890', 'TypeScript', 1],
];

for (const [address, topic, attempt] of testCases) {
  const seed = computeSeed(address as string, topic, attempt as number);
  const isSafe = seed < 3000000000;
  console.log(`Address: ${(address as string).substring(0, 10)}...`);
  console.log(`  Topic: ${topic}, Attempt: ${attempt}`);
  console.log(`  Seed: ${seed}`);
  console.log(`  Safe: ${isSafe ? '✅ YES' : '❌ NO'}`);
  console.log('');
}

console.log('All seeds should be < 3,000,000,000 (3B)');
