# Plan: Complete RTFM-Sovereign Smart Contract Integration

## Current State
- ✅ Roadmap generation works (TEE + Eigen AI)
- ✅ GradingService exists (not signed/cryptographic yet)
- ❌ No smart contract deployed
- ❌ No staking mechanism
- ❌ No on-chain attestation
- ❌ No wallet connection for users

## Target State (Sovereign Vision)

### Phase 1: Smart Contract Development

#### 1.1 Core Contracts
Create `contracts/` directory with:
- `SkillAttestation.sol` - Main contract for attestation registry
  - `submitAttestation(address user, string skill, uint256 score, bytes signature)` - TEE calls this
  - `verifyAttestation(address user, string skill)` - Public view function for employers
  - `getAttestation(address user, string skill)` - Returns full attestation data
  - `skillCount(address user)` - Track verified skills per user
  - Events: `AttestationSubmitted(address user, string skill, uint256 score, uint256 timestamp)`

- `SkillStaking.sol` - Staking & economic incentive contract
  - `stake(string skill, uint256 amount)` - Lock 0.001 ETH
  - `unlockStake()` - Get refund after passing (80%) or fail (20%)
  - `calculateReward(uint256 score)` - Returns ETH to return based on score
  - Events: `StakeLocked(address user, string skill, uint256 amount)`, `RewardClaimed(address user, uint256 amount)`

#### 1.2 Contract Features
- **Stake Amount**: 0.001 ETH (configurable)
- **Refund Logic**:
  - Score >= 70: Return 0.0008 ETH (80%)
  - Score < 70: Return 0.0002 ETH (20%)
  - Remaining 0.0002 ETH goes to treasury (protocol fee)
- **TEE Whitelist**: Only TEE address can call `submitAttestation`
- **Ownership**: Renounceable (or time-locked) for "ownerless" claim

#### 1.3 Deployment
- Deploy to **Sepolia testnet**
- Use `foundry` or `hardhat` for testing
- Verify contracts on Etherscan

### Phase 2: TEE - Smart Contract Integration

#### 2.1 TEE Wallet Setup
- Configure TEE service with wallet that can:
  - Call `submitAttestation()` on Sepolia
  - Handle Sepolia gas fees
- Update `.env.production` with:
  - `CONTRACT_ADDRESS=<deployed_address>`
  - `RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY`

#### 2.2 TEE Service Updates
Modify `apps/tee/src/`:
- `GradingService.ts`:
  - After grading, create EIP-712 signature
  - Sign score with TEE private key
  - Call contract `submitAttestation(userAddress, skill, score, signature)`
- Add new endpoint `POST /challenge/submit`:
  - Accepts user answers
  - Grades via GradingService
  - Submits to blockchain
  - Returns transaction hash

### Phase 3: Frontend - Wallet & Staking UI

#### 3.1 Wallet Connection
- Already have RainbowKit configured (from earlier fixes)
- Add to `apps/web/app/page.tsx`:
  - "Connect Wallet" button (if not connected)
  - Display connected address
  - Switch to Sepolia network

#### 3.2 Staking Flow
Create `apps/web/components/stake-modal.tsx`:
- "Stake 0.001 ETH to Prove [Skill]" button
- Opens RainbowKit for transaction
- Call `SkillStaking.stake(skill, 0.001 ether)`
- Show transaction pending/success
- After stake, enable "Take Challenge" button

#### 3.3 Attestation Display
Update `apps/web/app/verify/page.tsx`:
- "Verify Your Skill" page
- Input: Address + Skill
- Call `SkillAttestation.verifyAttestation(userAddress, skill)`
- Display: Score, Timestamp, TEE Signature, On-chain link

### Phase 4: Complete Sovereign Flow

#### 4.1 User Journey
1. **Stake**: User stakes 0.001 ETH on Sepolia via frontend
2. **Generate**: TEE generates deterministic challenge (already works)
3. **Answer**: User submits answers (24h timer)
4. **Grade**: TEE evaluates answers (already works, need blockchain submit)
5. **Attest**: TEE signs + submits to contract
6. **Claim**: User claims refund (80% if pass, 20% if fail)
7. **Verify**: Anyone calls `verifyAttestation()` to check skill

#### 4.2 Trustless Verification
- TEE signature proves: "I (hardware) graded this"
- Blockchain timestamp proves: "This happened at time T"
- Smart contract proves: "This can't be changed"

### Phase 5: Testing & Deployment

#### 5.1 Testnet Testing
- Deploy contracts to Sepolia
- Test full flow with fake wallet
- Verify staking → challenge → grading → attestation → refund

#### 5.2 EigenCloud Deployment
- Update TEE deployment to permanent instance
- Configure with real Sepolia contract
- Test production flow

## Detailed Implementation Steps

### Step 1: Create Smart Contracts
```bash
# Setup
cd apps/contracts
npm init -y
npm install @openzeppelin/contracts hardhat @nomicfoundation/hardhat-toolbox
```

### Step 2: Write SkillAttestation.sol
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SkillAttestation is ReentrancyGuard, Ownable {
    struct Attestation {
        uint256 score;
        uint256 timestamp;
        bytes signature;
        bool exists;
    }

    mapping(address => mapping(string => Attestation)) public attestations;
    mapping(address => uint256) public skillCount;

    address public teeVerifier;

    event AttestationSubmitted(
        address indexed user,
        string skill,
        uint256 score,
        uint256 timestamp
    );

    constructor(address _teeVerifier) Ownable(msg.sender) {
        teeVerifier = _teeVerifier;
    }

    function submitAttestation(
        address user,
        string memory skill,
        uint256 score,
        bytes memory signature
    ) external onlyTEE nonReentrant {
        require(score <= 100, "Invalid score");
        
        attestations[user][skill] = Attestation({
            score: score,
            timestamp: block.timestamp,
            signature: signature,
            exists: true
        });
        
        skillCount[user]++;
        
        emit AttestationSubmitted(user, skill, score, block.timestamp);
    }

    function verifyAttestation(address user, string skill)
        external
        view
        returns (uint256 score, uint256 timestamp, bytes memory signature)
    {
        Attestation memory att = attestations[user][skill];
        require(att.exists, "Attestation not found");
        return (att.score, att.timestamp, att.signature);
    }

    modifier onlyTEE() {
        require(msg.sender == teeVerifier, "Only TEE can attest");
        _;
    }
}
```

### Step 3: Write SkillStaking.sol
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SkillStaking is ReentrancyGuard, Ownable {
    uint256 public constant STAKE_AMOUNT = 0.001 ether;
    uint256 public constant PASS_REWARD_PERCENTAGE = 80;
    uint256 public constant FAIL_REWARD_PERCENTAGE = 20;
    uint256 public constant PROTOCOL_FEE = 20; // basis points

    struct Stake {
        uint256 amount;
        uint256 timestamp;
        string skill;
        bool completed;
        bool claimed;
    }

    mapping(address => mapping(string => Stake)) public stakes;
    uint256 public treasuryBalance;

    event StakeLocked(address indexed user, string skill, uint256 amount);
    event RewardClaimed(address indexed user, uint256 amount);

    constructor() Ownable(msg.sender) {}

    function stake(string memory skill)
        external
        payable
        nonReentrant
    {
        require(msg.value >= STAKE_AMOUNT, "Insufficient stake");
        require(stakes[msg.sender][skill].amount == 0, "Already staked");
        
        stakes[msg.sender][skill] = Stake({
            amount: msg.value,
            timestamp: block.timestamp,
            skill: skill,
            completed: false,
            claimed: false
        });
        
        emit StakeLocked(msg.sender, skill, msg.value);
    }

    function claimReward(address user, string memory skill, uint256 score)
        external
        onlyTEE
        nonReentrant
    {
        Stake storage s = stakes[user][skill];
        require(s.amount > 0, "No stake found");
        require(!s.claimed, "Already claimed");
        
        uint256 reward;
        if (score >= 70) {
            reward = (s.amount * PASS_REWARD_PERCENTAGE) / 100;
        } else {
            reward = (s.amount * FAIL_REWARD_PERCENTAGE) / 100;
        }
        
        uint256 fee = s.amount - reward;
        treasuryBalance += fee;
        
        s.completed = true;
        s.claimed = true;
        
        payable(user).transfer(reward);
        emit RewardClaimed(user, reward);
    }

    function withdrawTreasury() external onlyOwner {
        payable(owner()).transfer(treasuryBalance);
        treasuryBalance = 0;
    }

    modifier onlyTEE() {
        require(msg.sender == owner(), "Only TEE can claim");
        _;
    }
}
```

### Step 4: Deploy to Sepolia
```bash
npx hardhat compile
npx hardhat run scripts/deploy.js --network sepolia
```

### Step 5: Update TEE Service
- Add contract ABI to `apps/tee/src/contracts/`
- Update `GradingService` to call `submitAttestation` after grading
- Add Sepolia RPC to `.env.production`

### Step 6: Update Frontend
- Add staking UI component
- Add wallet connection check
- Add attestation verification page

### Step 7: Deploy to EigenCloud
- Update `.env.production` with Sepolia contract address
- Deploy TEE service with wallet configured for contract interaction

## Files to Create/Modify

### New Files
- `contracts/SkillAttestation.sol`
- `contracts/SkillStaking.sol`
- `contracts/hardhat.config.js`
- `contracts/scripts/deploy.js`
- `apps/web/components/stake-modal.tsx`
- `apps/web/app/verify/page.tsx`

### Modified Files
- `apps/tee/src/GradingService.ts`
- `apps/tee/src/server.ts` (add `/challenge/submit` endpoint)
- `apps/tee/.env.production` (add contract address)
- `apps/web/app/page.tsx` (add staking UI)
- `apps/web/lib/store.ts` (add staking state)

## Success Criteria

- ✅ Contracts deployed to Sepolia
- ✅ TEE can submit attestations to contract
- ✅ Users can stake 0.001 ETH via RainbowKit
- ✅ TEE grades and signs scores cryptographically
- ✅ Anyone can verify attestation on-chain
- ✅ Users receive refunds based on score
- ✅ Full sovereign flow working end-to-end

## Estimated Time
- Phase 1 (Contracts): 2-3 hours
- Phase 2 (TEE Integration): 2-3 hours
- Phase 3 (Frontend): 3-4 hours
- Phase 4 (Testing): 1-2 hours
- Phase 5 (Deployment): 1 hour

**Total: ~10-15 hours of focused work**
