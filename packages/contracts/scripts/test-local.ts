import hre from 'hardhat';
import { ethers } from 'hardhat';
import { expect } from 'chai';

interface TestResults {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  gasUsage: Record<string, bigint>;
  errors: string[];
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║           Chunk 2: Local Testing                          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');

  const results: TestResults = {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    gasUsage: {},
    errors: []
  };

  const [deployer, user1, user2] = await ethers.getSigners();
  
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`👤 User 1: ${user1.address}`);
  console.log(`👤 User 2: ${user2.address}`);
  console.log('');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1️⃣  Deploying Contracts to Local Network');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const deployTx = await ethers.provider.getBlock('latest');
  const deployStart = deployTx?.number || 0n;

  const SkillStaking = await ethers.getContractFactory('SkillStaking');
  const staking = await SkillStaking.deploy(deployer.address);
  await staking.waitForDeployment();
  const stakingAddress = await staking.getAddress();

  const SkillAttestation = await ethers.getContractFactory('SkillAttestation');
  const attestation = await SkillAttestation.deploy(deployer.address);
  await attestation.waitForDeployment();
  const attestationAddress = await attestation.getAddress();

  const deployEnd = (await ethers.provider.getBlock('latest'))?.number || 0n;
  const deployGas = deployEnd - deployStart;

  results.gasUsage['deployment'] = deployGas;

  console.log(`✅ SkillStaking:   ${stakingAddress}`);
  console.log(`✅ SkillAttestation: ${attestationAddress}`);
  console.log(`⛽ Deployment Gas: ${deployGas.toString()}`);
  console.log('');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('2️⃣  Testing Staking Contract');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const skillTopic = 'react-card';
  const STAKE_AMOUNT = ethers.parseEther('0.001');

  results.totalTests++;

  try {
    console.log('\n📝 Test 2.1: User can stake correct amount');
    
    const stakeTx = await staking.connect(user1).stake(skillTopic, { value: STAKE_AMOUNT });
    const receipt = await stakeTx.wait();
    
    results.gasUsage['stake'] = receipt!.gasUsed;
    results.passedTests++;
    console.log(`✅ PASS - Stake recorded, Gas: ${receipt!.gasUsed.toString()}`);

  } catch (error: any) {
    results.failedTests++;
    results.errors.push(`Stake test failed: ${error.message}`);
    console.log(`❌ FAIL - ${error.message}`);
  }

  results.totalTests++;

  try {
    console.log('\n📝 Test 2.2: Reject incorrect stake amount');
    
    const wrongAmount = ethers.parseEther('0.002');
    
    await expect(
      staking.connect(user1).stake('solidity-basics', { value: wrongAmount })
    ).to.be.revertedWith('Incorrect stake amount');
    
    results.passedTests++;
    console.log('✅ PASS - Incorrect amount rejected');

  } catch (error: any) {
    results.failedTests++;
    results.errors.push(`Stake validation test failed: ${error.message}`);
    console.log(`❌ FAIL - ${error.message}`);
  }

  results.totalTests++;

  try {
    console.log('\n📝 Test 2.3: Reject duplicate stake');
    
    await expect(
      staking.connect(user1).stake(skillTopic, { value: STAKE_AMOUNT })
    ).to.be.revertedWith('Already staked for this skill');
    
    results.passedTests++;
    console.log('✅ PASS - Duplicate stake rejected');

  } catch (error: any) {
    results.failedTests++;
    results.errors.push(`Duplicate stake test failed: ${error.message}`);
    console.log(`❌ FAIL - ${error.message}`);
  }

  results.totalTests++;

  try {
    console.log('\n📝 Test 2.4: TEE can record milestone');
    
    const milestoneTx = await staking.connect(deployer).recordMilestone(user1.address, skillTopic, 1);
    const receipt = await milestoneTx.wait();
    
    results.gasUsage['recordMilestone'] = receipt!.gasUsed;
    results.passedTests++;
    console.log(`✅ PASS - Milestone recorded, Gas: ${receipt!.gasUsed.toString()}`);

  } catch (error: any) {
    results.failedTests++;
    results.errors.push(`Milestone recording test failed: ${error.message}`);
    console.log(`❌ FAIL - ${error.message}`);
  }

  results.totalTests++;

  try {
    console.log('\n📝 Test 2.5: Reject non-TEE milestone recording');
    
    await expect(
      staking.connect(user1).recordMilestone(user1.address, skillTopic, 2)
    ).to.be.revertedWith('Only TEE can call this function');
    
    results.passedTests++;
    console.log('✅ PASS - Non-TEE rejected');

  } catch (error: any) {
    results.failedTests++;
    results.errors.push(`Non-TEE rejection test failed: ${error.message}`);
    console.log(`❌ FAIL - ${error.message}`);
  }

  results.totalTests++;

  try {
    console.log('\n📝 Test 2.6: Calculate refund for passing score (80%)');
    
    const balanceBefore = await ethers.provider.getBalance(user1.address);
    
    const refundTx = await staking.connect(deployer).claimRefund(user1.address, skillTopic, 85);
    const receipt = await refundTx.wait();
    
    const balanceAfter = await ethers.provider.getBalance(user1.address);
    const refundAmount = balanceAfter - balanceBefore;
    const expectedRefund = (STAKE_AMOUNT * 80n) / 100n;
    
    results.gasUsage['claimRefund'] = receipt!.gasUsed;
    
    expect(refundAmount).to.equal(expectedRefund);
    results.passedTests++;
    console.log(`✅ PASS - Refund: ${ethers.formatEther(refundAmount)} ETH, Gas: ${receipt!.gasUsed.toString()}`);

  } catch (error: any) {
    results.failedTests++;
    results.errors.push(`Refund calculation test failed: ${error.message}`);
    console.log(`❌ FAIL - ${error.message}`);
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('3️⃣  Testing Attestation Contract');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const domain = {
    name: 'RTFM-Sovereign',
    version: '1',
    chainId: 31337,
    verifyingContract: attestationAddress
  };

  const types = {
    Attestation: [
      { name: 'user', type: 'address' },
      { name: 'skill', type: 'string' },
      { name: 'score', type: 'uint256' },
      { name: 'nonce', type: 'uint256' }
    ]
  };

  results.totalTests++;

  try {
    console.log('\n📝 Test 3.1: TEE can submit attestation');
    
    const skill = 'react-card';
    const score = 85;
    const ipfsHash = 'QmTest123';
    const milestoneScores = [80, 85, 90, 88, 82, 87, 83];

    const value = { user: user2.address, skill, score, nonce: 0 };
    const signature = await deployer.signTypedData(domain, types, value);

    const attestTx = await attestation.connect(deployer).submitAttestation(
      user2.address,
      skill,
      score,
      signature,
      ipfsHash,
      milestoneScores
    );
    const receipt = await attestTx.wait();
    
    results.gasUsage['submitAttestation'] = receipt!.gasUsed;
    results.passedTests++;
    console.log(`✅ PASS - Attestation submitted, Gas: ${receipt!.gasUsed.toString()}`);

  } catch (error: any) {
    results.failedTests++;
    results.errors.push(`Attestation submission test failed: ${error.message}`);
    console.log(`❌ FAIL - ${error.message}`);
  }

  results.totalTests++;

  try {
    console.log('\n📝 Test 3.2: Reject non-TEE attestation');
    
    const skill = 'solidity-basics';
    const score = 75;
    const ipfsHash = 'QmTest456';
    const milestoneScores = [70, 75, 80, 77, 73, 78, 74];

    const value = { user: user2.address, skill, score, nonce: 1 };
    const signature = await deployer.signTypedData(domain, types, value);

    await expect(
      attestation.connect(user1).submitAttestation(
        user2.address,
        skill,
        score,
        signature,
        ipfsHash,
        milestoneScores
      )
    ).to.be.revertedWith('Only TEE can call this function');
    
    results.passedTests++;
    console.log('✅ PASS - Non-TEE rejected');

  } catch (error: any) {
    results.failedTests++;
    results.errors.push(`Non-TEE attestation test failed: ${error.message}`);
    console.log(`❌ FAIL - ${error.message}`);
  }

  results.totalTests++;

  try {
    console.log('\n📝 Test 3.3: Verify attestation exists');
    
    const result = await attestation.verifyAttestation(user2.address, 'react-card');
    
    expect(result.exists).to.be.true;
    expect(result.score).to.equal(85);
    results.passedTests++;
    console.log('✅ PASS - Attestation verified');

  } catch (error: any) {
    results.failedTests++;
    results.errors.push(`Attestation verification test failed: ${error.message}`);
    console.log(`❌ FAIL - ${error.message}`);
  }

  results.totalTests++;

  try {
    console.log('\n📝 Test 3.4: Retrieve attestation history');
    
    const history = await attestation.getAttestationHistory(user2.address);
    
    expect(history.length).to.be.greaterThan(0);
    expect(history).to.include('react-card');
    results.passedTests++;
    console.log(`✅ PASS - History retrieved, ${history.length} attestations`);

  } catch (error: any) {
    results.failedTests++;
    results.errors.push(`History retrieval test failed: ${error.message}`);
    console.log(`❌ FAIL - ${error.message}`);
  }

  results.totalTests++;

  try {
    console.log('\n📝 Test 3.5: Reject invalid score (>100)');
    
    const skill = 'invalid-score-test';
    const score = 101;
    const ipfsHash = 'QmTest789';
    const milestoneScores = [80, 85, 90, 88, 82, 87, 83];

    const value = { user: user2.address, skill, score, nonce: 2 };
    const signature = await deployer.signTypedData(domain, types, value);

    await expect(
      attestation.connect(deployer).submitAttestation(
        user2.address,
        skill,
        score,
        signature,
        ipfsHash,
        milestoneScores
      )
    ).to.be.revertedWith('Invalid score');
    
    results.passedTests++;
    console.log('✅ PASS - Invalid score rejected');

  } catch (error: any) {
    results.failedTests++;
    results.errors.push(`Invalid score test failed: ${error.message}`);
    console.log(`❌ FAIL - ${error.message}`);
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('4️⃣  Testing Error Conditions');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  results.totalTests++;

  try {
    console.log('\n📝 Test 4.1: Reject duplicate attestation');
    
    const skill = 'react-card';
    const score = 85;
    const ipfsHash = 'QmTest123';
    const milestoneScores = [80, 85, 90, 88, 82, 87, 83];

    const value = { user: user2.address, skill, score, nonce: 0 };
    const signature = await deployer.signTypedData(domain, types, value);

    await expect(
      attestation.connect(deployer).submitAttestation(
        user2.address,
        skill,
        score,
        signature,
        ipfsHash,
        milestoneScores
      )
    ).to.be.revertedWith('Attestation already exists');
    
    results.passedTests++;
    console.log('✅ PASS - Duplicate attestation rejected');

  } catch (error: any) {
    results.failedTests++;
    results.errors.push(`Duplicate attestation test failed: ${error.message}`);
    console.log(`❌ FAIL - ${error.message}`);
  }

  results.totalTests++;

  try {
    console.log('\n📝 Test 4.2: Reject milestone after refund');
    
    await expect(
      staking.connect(deployer).recordMilestone(user1.address, skillTopic, 2)
    ).to.be.revertedWith('Stake already refunded');
    
    results.passedTests++;
    console.log('✅ PASS - Milestone after refund rejected');

  } catch (error: any) {
    results.failedTests++;
    results.errors.push(`Milestone after refund test failed: ${error.message}`);
    console.log(`❌ FAIL - ${error.message}`);
  }

  results.totalTests++;

  try {
    console.log('\n📝 Test 4.3: Reject duplicate refund');
    
    await expect(
      staking.connect(deployer).claimRefund(user1.address, skillTopic, 85)
    ).to.be.revertedWith('Stake already refunded');
    
    results.passedTests++;
    console.log('✅ PASS - Duplicate refund rejected');

  } catch (error: any) {
    results.failedTests++;
    results.errors.push(`Duplicate refund test failed: ${error.message}`);
    console.log(`❌ FAIL - ${error.message}`);
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('5️⃣  Measuring Gas Consumption');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  console.log('\n📊 Gas Usage Summary:');
  console.log('┌─────────────────────────────────────┬─────────────────┐');
  console.log('│ Function                         │ Gas Used        │');
  console.log('├─────────────────────────────────────┼─────────────────┤');

  for (const [func, gas] of Object.entries(results.gasUsage)) {
    console.log(`│ ${func.padEnd(32)} │ ${gas.toString().padStart(15)} │`);
  }

  const totalGas = Object.values(results.gasUsage).reduce((acc, val) => acc + val, 0n);
  console.log('├─────────────────────────────────────┼─────────────────┤');
  console.log(`│ ${'TOTAL'.padEnd(32)} │ ${totalGas.toString().padStart(15)} │`);
  console.log('└─────────────────────────────────────┴─────────────────┘');

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('6️⃣  Test Results Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  console.log('');
  console.log('┌────────────────────────────────────────────────────────────────┐');
  console.log('│                   TEST SUMMARY                            │');
  console.log('├────────────────────────────────────────────────────────────────┤');
  console.log(`│ Total Tests:           ${results.totalTests.toString().padStart(20)} │`);
  console.log(`│ Passed Tests:          ${results.passedTests.toString().padStart(20)} │`);
  console.log(`│ Failed Tests:          ${results.failedTests.toString().padStart(20)} │`);
  console.log(`│ Success Rate:          ${((results.passedTests / results.totalTests) * 100).toFixed(1).padStart(20)}% │`);
  console.log('└────────────────────────────────────────────────────────────────┘');

  if (results.failedTests === 0) {
    console.log('');
    console.log('✅ ALL TESTS PASSED');
    console.log('✅ Contracts ready for testnet deployment');
    console.log('');
  } else {
    console.log('');
    console.log('❌ SOME TESTS FAILED');
    console.log('\n📋 Errors encountered:');
    for (const error of results.errors) {
      console.log(`  - ${error}`);
    }
    console.log('');
    process.exit(1);
  }

  return results;
}

main()
  .then(() => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Chunk 2: Local Testing - COMPLETED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
