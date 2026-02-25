import { expect } from 'chai';
import { ethers } from 'hardhat';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { time } from '@nomicfoundation/hardhat-network-helpers';

describe('SkillStaking', function () {
  let staking: any;
  let owner: SignerWithAddress;
  let teeAttestor: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  const STAKE_AMOUNT = ethers.parseEther('0.001');

  beforeEach(async function () {
    [owner, teeAttestor, user1, user2] = await ethers.getSigners();

    const SkillStaking = await ethers.getContractFactory('SkillStaking');
    staking = await SkillStaking.deploy(teeAttestor.address);
    await staking.waitForDeployment();
  });

  describe('Deployment', function () {
    it('Should deploy successfully', async function () {
      expect(await staking.getAddress()).to.be.properAddress;
    });

    it('Should set owner correctly', async function () {
      expect(await staking.owner()).to.equal(owner.address);
    });

    it('Should set TEE attestor correctly', async function () {
      expect(await staking.teeAttestor()).to.equal(teeAttestor.address);
    });

    it('Should set STAKE_AMOUNT constant', async function () {
      expect(await staking.STAKE_AMOUNT()).to.equal(STAKE_AMOUNT);
    });

    it('Should set PASS_THRESHOLD constant', async function () {
      expect(await staking.PASS_THRESHOLD()).to.equal(70);
    });
  });

  describe('stake', function () {
    it('Should allow user to stake correct amount', async function () {
      const skillTopic = 'react-card';

      await expect(
        staking.connect(user1).stake(skillTopic, { value: STAKE_AMOUNT })
      ).to.emit(staking, 'StakeLocked')
       .withArgs(user1.address, skillTopic, STAKE_AMOUNT);

      const stake = await staking.stakes(user1.address, skillTopic);

      expect(stake.amount).to.equal(STAKE_AMOUNT);
      expect(stake.stakedAt).to.be.greaterThan(0);
      expect(stake.milestoneCheckpoint).to.equal(0);
      expect(stake.attestationComplete).to.be.false;
      expect(stake.refunded).to.be.false;
      expect(stake.skillTopic).to.equal(skillTopic);
    });

    it('Should reject incorrect stake amount', async function () {
      const skillTopic = 'react-card';
      const wrongAmount = ethers.parseEther('0.002');

      await expect(
        staking.connect(user1).stake(skillTopic, { value: wrongAmount })
      ).to.be.revertedWith('Incorrect stake amount');
    });

    it('Should reject duplicate stake for same skill', async function () {
      const skillTopic = 'react-card';

      await staking.connect(user1).stake(skillTopic, { value: STAKE_AMOUNT });

      await expect(
        staking.connect(user1).stake(skillTopic, { value: STAKE_AMOUNT })
      ).to.be.revertedWith('Already staked for this skill');
    });

    it('Should allow same user to stake for different skills', async function () {
      const skill1 = 'react-card';
      const skill2 = 'solidity-basics';

      await staking.connect(user1).stake(skill1, { value: STAKE_AMOUNT });
      await staking.connect(user1).stake(skill2, { value: STAKE_AMOUNT });

      const stake1 = await staking.stakes(user1.address, skill1);
      const stake2 = await staking.stakes(user1.address, skill2);

      expect(stake1.amount).to.equal(STAKE_AMOUNT);
      expect(stake2.amount).to.equal(STAKE_AMOUNT);
    });

    it('Should receive ETH correctly', async function () {
      const skillTopic = 'react-card';

      const balanceBefore = await ethers.provider.getBalance(await staking.getAddress());

      await staking.connect(user1).stake(skillTopic, { value: STAKE_AMOUNT });

      const balanceAfter = await ethers.provider.getBalance(await staking.getAddress());

      expect(balanceAfter - balanceBefore).to.equal(STAKE_AMOUNT);
    });
  });

  describe('recordMilestone', function () {
    beforeEach(async function () {
      const skillTopic = 'react-card';
      await staking.connect(user1).stake(skillTopic, { value: STAKE_AMOUNT });
    });

    it('Should allow TEE attestor to record milestone', async function () {
      const skill = 'react-card';
      const milestoneId = 1;

      await expect(
        staking.connect(teeAttestor).recordMilestone(user1.address, skill, milestoneId)
      ).to.emit(staking, 'MilestoneRecorded')
       .withArgs(user1.address, skill, milestoneId);

      const stake = await staking.stakes(user1.address, skill);

      expect(stake.milestoneCheckpoint).to.equal(milestoneId);
    });

    it('Should reject non-TEE attestor', async function () {
      const skill = 'react-card';
      const milestoneId = 1;

      await expect(
        staking.connect(user1).recordMilestone(user1.address, skill, milestoneId)
      ).to.be.revertedWith('Only TEE can call this function');
    });

    it('Should reject milestone for non-existent stake', async function () {
      const skill = 'solidity-basics';
      const milestoneId = 1;

      await expect(
        staking.connect(teeAttestor).recordMilestone(user1.address, skill, milestoneId)
      ).to.be.revertedWith('No active stake found');
    });

    it('Should reject already refunded stake', async function () {
      const skill = 'react-card';

      await staking.connect(teeAttestor).claimRefund(user1.address, skill, 85);

      await expect(
        staking.connect(teeAttestor).recordMilestone(user1.address, skill, 2)
      ).to.be.revertedWith('Stake already refunded');
    });

    it('Should reject duplicate milestone', async function () {
      const skill = 'react-card';
      const milestoneId = 1;

      await staking.connect(teeAttestor).recordMilestone(user1.address, skill, milestoneId);

      await expect(
        staking.connect(teeAttestor).recordMilestone(user1.address, skill, milestoneId)
      ).to.be.revertedWith('Milestone already recorded');
    });

    it('Should reject milestone > 5', async function () {
      const skill = 'react-card';
      const milestoneId = 6;

      await expect(
        staking.connect(teeAttestor).recordMilestone(user1.address, skill, milestoneId)
      ).to.be.revertedWith('Invalid milestone ID');
    });

    it('Should allow sequential milestones', async function () {
      const skill = 'react-card';

      await staking.connect(teeAttestor).recordMilestone(user1.address, skill, 1);
      await staking.connect(teeAttestor).recordMilestone(user1.address, skill, 2);
      await staking.connect(teeAttestor).recordMilestone(user1.address, skill, 3);

      const stake = await staking.stakes(user1.address, skill);

      expect(stake.milestoneCheckpoint).to.equal(3);
    });
  });

  describe('claimRefund', function () {
    beforeEach(async function () {
      const skillTopic = 'react-card';
      await staking.connect(user1).stake(skillTopic, { value: STAKE_AMOUNT });
    });

    it('Should claim 80% refund for passing score (>=70)', async function () {
      const skill = 'react-card';
      const finalScore = 85;

      const balanceBefore = await ethers.provider.getBalance(user1.address);

      await expect(
        staking.connect(teeAttestor).claimRefund(user1.address, skill, finalScore)
      ).to.emit(staking, 'RefundClaimed');

      const balanceAfter = await ethers.provider.getBalance(user1.address);
      const refundAmount = balanceAfter - balanceBefore;
      const expectedRefund = (STAKE_AMOUNT * 80n) / 100n;

      expect(refundAmount).to.equal(expectedRefund);

      const stake = await staking.stakes(user1.address, skill);
      expect(stake.refunded).to.be.true;
      expect(stake.attestationComplete).to.be.true;
    });

    it('Should claim 20% refund for failing score (<70)', async function () {
      const skill = 'react-card';
      const finalScore = 65;

      const balanceBefore = await ethers.provider.getBalance(user1.address);

      await staking.connect(teeAttestor).claimRefund(user1.address, skill, finalScore);

      const balanceAfter = await ethers.provider.getBalance(user1.address);
      const refundAmount = balanceAfter - balanceBefore;
      const expectedRefund = (STAKE_AMOUNT * 20n) / 100n;

      expect(refundAmount).to.equal(expectedRefund);

      const stake = await staking.stakes(user1.address, skill);
      expect(stake.refunded).to.be.true;
    });

    it('Should claim 80% refund for exact passing score (70)', async function () {
      const skill = 'react-card';
      const finalScore = 70;

      const balanceBefore = await ethers.provider.getBalance(user1.address);

      await staking.connect(teeAttestor).claimRefund(user1.address, skill, finalScore);

      const balanceAfter = await ethers.provider.getBalance(user1.address);
      const refundAmount = balanceAfter - balanceBefore;
      const expectedRefund = (STAKE_AMOUNT * 80n) / 100n;

      expect(refundAmount).to.equal(expectedRefund);
    });

    it('Should reject non-TEE attestor', async function () {
      const skill = 'react-card';
      const finalScore = 85;

      await expect(
        staking.connect(user1).claimRefund(user1.address, skill, finalScore)
      ).to.be.revertedWith('Only TEE can call this function');
    });

    it('Should reject refund for non-existent stake', async function () {
      const skill = 'solidity-basics';
      const finalScore = 85;

      await expect(
        staking.connect(teeAttestor).claimRefund(user1.address, skill, finalScore)
      ).to.be.revertedWith('No active stake found');
    });

    it('Should reject duplicate refund', async function () {
      const skill = 'react-card';

      await staking.connect(teeAttestor).claimRefund(user1.address, skill, 85);

      await expect(
        staking.connect(teeAttestor).claimRefund(user1.address, skill, 85)
      ).to.be.revertedWith('Stake already refunded');
    });
  });

  describe('withdrawTreasury', function () {
    beforeEach(async function () {
      const skill = 'react-card';
      await staking.connect(user1).stake(skill, { value: STAKE_AMOUNT });
      await staking.connect(teeAttestor).claimRefund(user1.address, skill, 65);
    });

    it('Should allow owner to withdraw treasury', async function () {
      const balanceBefore = await ethers.provider.getBalance(owner.address);
      const contractBalance = await ethers.provider.getBalance(await staking.getAddress());

      await staking.connect(owner).withdrawTreasury();

      const balanceAfter = await ethers.provider.getBalance(owner.address);
      const expectedTreasury = (STAKE_AMOUNT * 20n) / 100n;

      expect(balanceAfter - balanceBefore).to.equal(expectedTreasury);
    });

    it('Should reject non-owner', async function () {
      await expect(
        staking.connect(user1).withdrawTreasury()
      ).to.be.revertedWithCustomError(
        staking,
        'OwnableUnauthorizedAccount'
      );
    });

    it('Should fail when treasury is empty', async function () {
      await staking.connect(owner).withdrawTreasury();

      await expect(
        staking.connect(owner).withdrawTreasury()
      ).to.be.revertedWith('No funds to withdraw');
    });
  });

  describe('updateTEEAttestor', function () {
    it('Should allow owner to update TEE attestor', async function () {
      await expect(
        staking.connect(owner).updateTEEAttestor(user2.address)
      ).to.emit(staking, 'TEEAttestorUpdated')
       .withArgs(user2.address);

      expect(await staking.teeAttestor()).to.equal(user2.address);
    });

    it('Should reject non-owner', async function () {
      await expect(
        staking.connect(user1).updateTEEAttestor(user2.address)
      ).to.be.revertedWithCustomError(
        staking,
        'OwnableUnauthorizedAccount'
      );
    });

    it('Should reject zero address', async function () {
      await expect(
        staking.connect(owner).updateTEEAttestor(ethers.ZeroAddress)
      ).to.be.revertedWith('Invalid address');
    });
  });

  describe('Edge Cases', function () {
    it('Should handle multiple users staking', async function () {
      const skill = 'react-card';

      await staking.connect(user1).stake(skill, { value: STAKE_AMOUNT });
      await staking.connect(user2).stake(skill, { value: STAKE_AMOUNT });

      const stake1 = await staking.stakes(user1.address, skill);
      const stake2 = await staking.stakes(user2.address, skill);

      expect(stake1.amount).to.equal(STAKE_AMOUNT);
      expect(stake2.amount).to.equal(STAKE_AMOUNT);
      expect(stake1.skillTopic).to.equal(stake2.skillTopic);
    });

    it('Should handle refund calculation correctly', async function () {
      const skill = 'react-card';
      await staking.connect(user1).stake(skill, { value: STAKE_AMOUNT });

      await staking.connect(teeAttestor).claimRefund(user1.address, skill, 90);

      const stake = await staking.stakes(user1.address, skill);

      expect(stake.refunded).to.be.true;
      expect(stake.attestationComplete).to.be.true;
    });
  });

  describe('Reentrancy', function () {
    it('Should prevent reentrancy on claimRefund', async function () {
      const skill = 'react-card';
      await staking.connect(user1).stake(skill, { value: STAKE_AMOUNT });

      const MaliciousContract = await ethers.getContractFactory('MaliciousReentrancyAttacker');
      const malicious = await MaliciousContract.deploy(
        await staking.getAddress(),
        skill
      );
      await malicious.waitForDeployment();

      await expect(
        malicious.attack({ value: STAKE_AMOUNT })
      ).to.be.reverted;
    });
  });
});
