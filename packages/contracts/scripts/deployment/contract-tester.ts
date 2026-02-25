import { ethers } from 'ethers';
import { TestResult } from './types';

export class ContractTester {
  private wallet: ethers.Wallet;
  private provider: ethers.JsonRpcProvider;

  constructor(privateKey: string, rpcUrl: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
  }

  public async testAttestationContract(
    contractAddress: string,
    abi: any[],
    teeSignerAddress: string
  ): Promise<TestResult[]> {
    console.log('\n[Tester] Testing Attestation contract...');
    const results: TestResult[] = [];
    const contract = new ethers.Contract(contractAddress, abi, this.wallet);

    try {
      const owner = await contract.owner();
      results.push({
        contract: 'Attestation',
        function: 'owner()',
        passed: true,
        error: undefined
      });
    } catch (error: any) {
      results.push({
        contract: 'Attestation',
        function: 'owner()',
        passed: false,
        error: error.message
      });
    }

    try {
      const teeSigner = await contract.teeSigner();
      const passed = teeSigner.toLowerCase() === teeSignerAddress.toLowerCase();
      results.push({
        contract: 'Attestation',
        function: 'teeSigner()',
        passed,
        error: passed ? undefined : `Expected ${teeSignerAddress}, got ${teeSigner}`
      });
    } catch (error: any) {
      results.push({
        contract: 'Attestation',
        function: 'teeSigner()',
        passed: false,
        error: error.message
      });
    }

    try {
      const result = await contract.verifyAttestation(this.wallet.address, 'test-skill');
      results.push({
        contract: 'Attestation',
        function: 'verifyAttestation()',
        passed: true
      });
    } catch (error: any) {
      results.push({
        contract: 'Attestation',
        function: 'verifyAttestation()',
        passed: false,
        error: error.message
      });
    }

    try {
      const history = await contract.getAttestationHistory(this.wallet.address);
      results.push({
        contract: 'Attestation',
        function: 'getAttestationHistory()',
        passed: true
      });
    } catch (error: any) {
      results.push({
        contract: 'Attestation',
        function: 'getAttestationHistory()',
        passed: false,
        error: error.message
      });
    }

    return results;
  }

  public async testStakingContract(
    contractAddress: string,
    abi: any[],
    teeAttestorAddress: string
  ): Promise<TestResult[]> {
    console.log('\n[Tester] Testing Staking contract...');
    const results: TestResult[] = [];
    const contract = new ethers.Contract(contractAddress, abi, this.wallet);

    try {
      const owner = await contract.owner();
      results.push({
        contract: 'Staking',
        function: 'owner()',
        passed: true
      });
    } catch (error: any) {
      results.push({
        contract: 'Staking',
        function: 'owner()',
        passed: false,
        error: error.message
      });
    }

    try {
      const teeAttestor = await contract.teeAttestor();
      const passed = teeAttestor.toLowerCase() === teeAttestorAddress.toLowerCase();
      results.push({
        contract: 'Staking',
        function: 'teeAttestor()',
        passed,
        error: passed ? undefined : `Expected ${teeAttestorAddress}, got ${teeAttestor}`
      });
    } catch (error: any) {
      results.push({
        contract: 'Staking',
        function: 'teeAttestor()',
        passed: false,
        error: error.message
      });
    }

    try {
      const stakeAmount = await contract.STAKE_AMOUNT();
      const passed = stakeAmount.toString() === ethers.parseEther('0.001').toString();
      results.push({
        contract: 'Staking',
        function: 'STAKE_AMOUNT',
        passed,
        error: passed ? undefined : `Expected 0.001 ETH, got ${ethers.formatEther(stakeAmount)} ETH`
      });
    } catch (error: any) {
      results.push({
        contract: 'Staking',
        function: 'STAKE_AMOUNT',
        passed: false,
        error: error.message
      });
    }

    try {
      const stake = await contract.stakes(this.wallet.address, 'test-skill');
      results.push({
        contract: 'Staking',
        function: 'stakes()',
        passed: true
      });
    } catch (error: any) {
      results.push({
        contract: 'Staking',
        function: 'stakes()',
        passed: false,
        error: error.message
      });
    }

    return results;
  }

  public async testStake(
    stakingAddress: string,
    stakingAbi: any[],
    skillTopic: string
  ): Promise<TestResult> {
    console.log(`\n[Tester] Testing stake function for ${skillTopic}...`);
    const contract = new ethers.Contract(stakingAddress, stakingAbi, this.wallet);

    try {
      const stakeAmount = ethers.parseEther('0.001');
      const tx = await contract.stake(skillTopic, { value: stakeAmount });
      await tx.wait();

      return {
        contract: 'Staking',
        function: 'stake()',
        passed: true,
        transactionHash: tx.hash
      };
    } catch (error: any) {
      return {
        contract: 'Staking',
        function: 'stake()',
        passed: false,
        error: error.message
      };
    }
  }

  public async testRecordMilestone(
    stakingAddress: string,
    stakingAbi: any[],
    userAddress: string,
    skill: string,
    milestoneId: number
  ): Promise<TestResult> {
    console.log(`\n[Tester] Testing recordMilestone for milestone ${milestoneId}...`);
    const contract = new ethers.Contract(stakingAddress, stakingAbi, this.wallet);

    try {
      const tx = await contract.recordMilestone(userAddress, skill, milestoneId);
      await tx.wait();

      return {
        contract: 'Staking',
        function: 'recordMilestone()',
        passed: true,
        transactionHash: tx.hash
      };
    } catch (error: any) {
      return {
        contract: 'Staking',
        function: 'recordMilestone()',
        passed: false,
        error: error.message
      };
    }
  }

  public async testClaimRefund(
    stakingAddress: string,
    stakingAbi: any[],
    userAddress: string,
    skill: string,
    finalScore: number
  ): Promise<TestResult> {
    console.log(`\n[Tester] Testing claimRefund with score ${finalScore}...`);
    const contract = new ethers.Contract(stakingAddress, stakingAbi, this.wallet);

    try {
      const tx = await contract.claimRefund(userAddress, skill, finalScore);
      await tx.wait();

      return {
        contract: 'Staking',
        function: 'claimRefund()',
        passed: true,
        transactionHash: tx.hash
      };
    } catch (error: any) {
      return {
        contract: 'Staking',
        function: 'claimRefund()',
        passed: false,
        error: error.message
      };
    }
  }

  public async testSubmitAttestation(
    attestationAddress: string,
    attestationAbi: any[],
    user: string,
    skill: string,
    score: number,
    signature: string,
    ipfsHash: string,
    milestoneScores: number[]
  ): Promise<TestResult> {
    console.log(`\n[Tester] Testing submitAttestation for ${skill}...`);
    const contract = new ethers.Contract(attestationAddress, attestationAbi, this.wallet);

    try {
      const tx = await contract.submitAttestation(
        user,
        skill,
        score,
        signature,
        ipfsHash,
        milestoneScores
      );
      await tx.wait();

      return {
        contract: 'Attestation',
        function: 'submitAttestation()',
        passed: true,
        transactionHash: tx.hash
      };
    } catch (error: any) {
      return {
        contract: 'Attestation',
        function: 'submitAttestation()',
        passed: false,
        error: error.message
      };
    }
  }
}
