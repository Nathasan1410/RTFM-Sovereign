import { expect } from 'chai';
import { ethers } from 'hardhat';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { SkillAttestation } from '../typechain-types';
import { time } from '@nomicfoundation/hardhat-network-helpers';

describe('SkillAttestation', function () {
  let attestation: any;
  let owner: SignerWithAddress;
  let teeSigner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let domain: any;
  let types: any;

  beforeEach(async function () {
    [owner, teeSigner, user1, user2] = await ethers.getSigners();

    const SkillAttestation = await ethers.getContractFactory('SkillAttestation');
    attestation = await SkillAttestation.deploy(teeSigner.address);
    await attestation.waitForDeployment();

    domain = {
      name: 'RTFM-Sovereign',
      version: '1',
      chainId: 31337,
      verifyingContract: await attestation.getAddress()
    };

    types = {
      Attestation: [
        { name: 'user', type: 'address' },
        { name: 'skill', type: 'string' },
        { name: 'score', type: 'uint256' },
        { name: 'nonce', type: 'uint256' }
      ]
    };
  });

  describe('Deployment', function () {
    it('Should deploy successfully', async function () {
      expect(await attestation.getAddress()).to.be.properAddress;
    });

    it('Should set owner correctly', async function () {
      expect(await attestation.owner()).to.equal(owner.address);
    });

    it('Should set TEE signer correctly', async function () {
      expect(await attestation.teeSigner()).to.equal(teeSigner.address);
    });
  });

  describe('submitAttestation', function () {
    it('Should allow TEE signer to submit attestation', async function () {
      const skill = 'react-card';
      const score = 85;
      const ipfsHash = 'QmTest123';
      const milestoneScores = [80, 85, 90, 88, 82, 87, 83];

      const value = { user: user1.address, skill, score, nonce: 0 };
      const signature = await teeSigner.signTypedData(domain, types, value);

      await expect(
        attestation.connect(teeSigner).submitAttestation(
          user1.address,
          skill,
          score,
          signature,
          ipfsHash,
          milestoneScores
        )
      ).to.emit(attestation, 'AttestationSubmitted')
       .withArgs(user1.address, skill, score);
    });

    it('Should reject non-TEE signer', async function () {
      const skill = 'react-card';
      const score = 85;
      const ipfsHash = 'QmTest123';
      const milestoneScores = [80, 85, 90, 88, 82, 87, 83];

      const value = { user: user1.address, skill, score, nonce: 0 };
      const signature = await teeSigner.signTypedData(domain, types, value);

      await expect(
        attestation.connect(user1).submitAttestation(
          user1.address,
          skill,
          score,
          signature,
          ipfsHash,
          milestoneScores
        )
      ).to.be.revertedWith('Only TEE can call this function');
    });

    it('Should reject invalid score > 100', async function () {
      const skill = 'react-card';
      const score = 101;
      const ipfsHash = 'QmTest123';
      const milestoneScores = [80, 85, 90, 88, 82, 87, 83];

      const value = { user: user1.address, skill, score, nonce: 0 };
      const signature = await teeSigner.signTypedData(domain, types, value);

      await expect(
        attestation.connect(teeSigner).submitAttestation(
          user1.address,
          skill,
          score,
          signature,
          ipfsHash,
          milestoneScores
        )
      ).to.be.revertedWith('Invalid score');
    });

    it('Should reject duplicate attestation', async function () {
      const skill = 'react-card';
      const score = 85;
      const ipfsHash = 'QmTest123';
      const milestoneScores = [80, 85, 90, 88, 82, 87, 83];

      const value = { user: user1.address, skill, score, nonce: 0 };
      const signature = await teeSigner.signTypedData(domain, types, value);

      await attestation.connect(teeSigner).submitAttestation(
        user1.address,
        skill,
        score,
        signature,
        ipfsHash,
        milestoneScores
      );

      await expect(
        attestation.connect(teeSigner).submitAttestation(
          user1.address,
          skill,
          score,
          signature,
          ipfsHash,
          milestoneScores
        )
      ).to.be.revertedWith('Attestation already exists');
    });

    it('Should reject invalid signature length', async function () {
      const skill = 'react-card';
      const score = 85;
      const ipfsHash = 'QmTest123';
      const milestoneScores = [80, 85, 90, 88, 82, 87, 83];

      await expect(
        attestation.connect(teeSigner).submitAttestation(
          user1.address,
          skill,
          score,
          '0x1234',
          ipfsHash,
          milestoneScores
        )
      ).to.be.revertedWith('Invalid signature length');
    });

    it('Should reject invalid signature', async function () {
      const skill = 'react-card';
      const score = 85;
      const ipfsHash = 'QmTest123';
      const milestoneScores = [80, 85, 90, 88, 82, 87, 83];

      const value = { user: user1.address, skill, score, nonce: 0 };
      const signature = await user1.signTypedData(domain, types, value);

      await expect(
        attestation.connect(teeSigner).submitAttestation(
          user1.address,
          skill,
          score,
          signature,
          ipfsHash,
          milestoneScores
        )
      ).to.be.revertedWith('Invalid signature');
    });
  });

  describe('verifyAttestation', function () {
    beforeEach(async function () {
      const skill = 'react-card';
      const score = 85;
      const ipfsHash = 'QmTest123';
      const milestoneScores = [80, 85, 90, 88, 82, 87, 83];

      const value = { user: user1.address, skill, score, nonce: 0 };
      const signature = await teeSigner.signTypedData(domain, types, value);

      await attestation.connect(teeSigner).submitAttestation(
        user1.address,
        skill,
        score,
        signature,
        ipfsHash,
        milestoneScores
      );
    });

    it('Should verify existing attestation', async function () {
      const result = await attestation.verifyAttestation(user1.address, 'react-card');

      expect(result.exists).to.be.true;
      expect(result.score).to.equal(85);
      expect(result.timestamp).to.be.greaterThan(0);
      expect(result.signature.length).to.equal(130);
    });

    it('Should return false for non-existent attestation', async function () {
      const result = await attestation.verifyAttestation(user2.address, 'react-card');

      expect(result.exists).to.be.false;
      expect(result.score).to.equal(0);
    });
  });

  describe('getAttestationHistory', function () {
    beforeEach(async function () {
      const skills = ['react-card', 'solidity-basics', 'eth-dev'];

      for (let i = 0; i < skills.length; i++) {
        const skill = skills[i];
        const score = 70 + i * 5;
        const ipfsHash = `QmTest${i}`;
        const milestoneScores = [70 + i * 5, 75 + i * 5, 80 + i * 5];

        const value = { user: user1.address, skill, score, nonce: i };
        const signature = await teeSigner.signTypedData(domain, types, value);

        await attestation.connect(teeSigner).submitAttestation(
          user1.address,
          skill,
          score,
          signature,
          ipfsHash,
          milestoneScores
        );
      }
    });

    it('Should return attestation history', async function () {
      const history = await attestation.getAttestationHistory(user1.address);

      expect(history.length).to.equal(3);
      expect(history).to.include('react-card');
      expect(history).to.include('solidity-basics');
      expect(history).to.include('eth-dev');
    });

    it('Should return empty array for user with no attestations', async function () {
      const history = await attestation.getAttestationHistory(user2.address);

      expect(history.length).to.equal(0);
    });
  });

  describe('updateTEESigner', function () {
    it('Should allow owner to update TEE signer', async function () {
      await expect(
        attestation.connect(owner).updateTEESigner(user2.address)
      ).to.emit(attestation, 'TEESignerUpdated')
       .withArgs(user2.address);

      expect(await attestation.teeSigner()).to.equal(user2.address);
    });

    it('Should reject non-owner', async function () {
      await expect(
        attestation.connect(user1).updateTEESigner(user2.address)
      ).to.be.revertedWithCustomError(
        attestation,
        'OwnableUnauthorizedAccount'
      );
    });

    it('Should reject zero address', async function () {
      await expect(
        attestation.connect(owner).updateTEESigner(ethers.ZeroAddress)
      ).to.be.revertedWith('Invalid address');
    });
  });

  describe('userAttestationCount', function () {
    it('Should increment count for each attestation', async function () {
      expect(await attestation.userAttestationCount(user1.address)).to.equal(0);

      const skill = 'react-card';
      const score = 85;
      const ipfsHash = 'QmTest123';
      const milestoneScores = [80, 85, 90, 88, 82, 87, 83];

      const value = { user: user1.address, skill, score, nonce: 0 };
      const signature = await teeSigner.signTypedData(domain, types, value);

      await attestation.connect(teeSigner).submitAttestation(
        user1.address,
        skill,
        score,
        signature,
        ipfsHash,
        milestoneScores
      );

      expect(await attestation.userAttestationCount(user1.address)).to.equal(1);
    });
  });

  describe('attestations mapping', function () {
    it('Should store attestation data correctly', async function () {
      const skill = 'react-card';
      const score = 85;
      const ipfsHash = 'QmTest123';
      const milestoneScores = [80, 85, 90, 88, 82, 87, 83];

      const value = { user: user1.address, skill, score, nonce: 0 };
      const signature = await teeSigner.signTypedData(domain, types, value);

      await attestation.connect(teeSigner).submitAttestation(
        user1.address,
        skill,
        score,
        signature,
        ipfsHash,
        milestoneScores
      );

      const attestation = await attestation.attestations(user1.address, skill);

      expect(attestation.score).to.equal(85);
      expect(attestation.timestamp).to.be.greaterThan(0);
      expect(attestation.signature).to.equal(signature);
      expect(attestation.ipfsHash).to.equal(ipfsHash);
      expect(attestation.exists).to.be.true;
      expect(attestation.milestoneScores).to.deep.equal(milestoneScores);
    });
  });
});
