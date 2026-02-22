# Technical Specification: Smart Contracts (Chunk 3)

**Role:** Project Manager | **Audience:** Developer
**Output:** Technical Specification Document
**Constraint:** ZERO code implementation. Decisions, requirements, and acceptance criteria only.

---

## 3.1 EXECUTIVE DECISIONS (Locked)

Decision-making for smart contract architecture is final.

### Decision Matrix: Core Architecture

| Area | Decision | Constraints | Impact |
|------|----------|-------------|---------|
| **Upgradeability** | Immutable Contract | No proxy patterns, no admin upgradeability | Once deployed, logic locked. Bug = redeploy new |
| **Ownership Model** | Two-Phase TEE Enrollment + Renounce | Phase 1: Deployer sets TEE address. Phase 2: TEE accepts. Phase 3: Ownership burned (address 0) | No single entity control after TEE active |
| **Signature Standard** | EIP-712 Typed Data | Domain separator must include chainId + contract address | Frontend (wagmi) compatible, anti-replay across chains |
| **Economic Model** | 20/80 Split | 20% fee to Treasury (TEE operational cost), 80% return to user (if pass) or slash (if fail) | Self-sustaining agent narrative |
| **State Management** | Explicit State Machine | 6 states: Idle → Staked → Attesting → Verified → (optional Disputed) → Released | Clear lifecycle, prevent invalid transitions |
| **Timeout Mechanism** | Mandatory | 7 days max for challenge completion, 24 hours for response | Prevent fund lock if TEE down |

---

## 3.2 FUNCTIONAL REQUIREMENTS (User Stories)

### FR-001: Staking Mechanism
**User Story:** As a learner, I want to stake ETH to prove commitment, with a fixed amount for predictability.

**Acceptance Criteria:**
- [ ] Only accept exact amount (0.001 ETH), reject if more or less
- [ ] Topic (string) must be unique per user (cannot double stake same topic)
- [ ] Generate unique stakeId for tracking
- [ ] Set automatic deadline (7 days from stake) to prevent lock
- [ ] Emit event indexable by frontend (user address, topic hash, amount, deadline)

**Risk:** Dust attack. Mitigation: Exact amount requirement.

---

### FR-002: TEE Enrollment Protocol
**User Story:** As a deployer, I need to setup TEE key securely without exposure, then burn access rights.

**Acceptance Criteria:**
- [ ] Constructor does not directly set TEE, use two-step pattern
- [ ] Step 1: Deployer propose TEE address + proof of possession (PoP)
- [ ] Step 2: TEE address itself calls activate (prove key ownership)
- [ ] Step 3: After activate, deployer address must be set to zero address (burn)
- [ ] No mechanism to change TEE after activation (immutable)

**Risk:** Fat-finger wrong TEE address. Mitigation: Proof of Possession verification mandatory.

---

### FR-003: Attestation Submission (Critical Security)
**User Story:** As a TEE agent, I need to submit exam results with cryptographic proof verifiable on-chain.

**Acceptance Criteria:**
- [ ] Verify signature using EIP-712 standard
- [ ] Signature must include: user address, topic, score, nonce (anti-replay), deadline (expiry)
- [ ] State check: Only submit if state = Attesting
- [ ] Score range: 0-100, with threshold 70 for passing
- [ ] Atomic operation: Verify signature → Update state → Transfer payout → Update treasury
- [ ] Reentrancy protection mandatory (Checks-Effects-Interactions pattern)

**Risk:** Replay attack. Mitigation: Nonce tracking per user + domain separator.

---

### FR-004: Economic Distribution
**User Story:** As a protocol, fund distribution must be automatic and transparent.

**Acceptance Criteria:**
- [ ] Passing (score >= 70): User receives 80% of stake, Treasury receives 20%
- [ ] Failing (score < 70): User receives 80% back (20% penalty to Treasury as sunk cost)
- [ ] Treasury can be withdrawn by TEE address anytime (to pay Cerebras API)
- [ ] Withdraw event must be logged with amount and destination address

**Business Rule:** Treasury balance must be sufficient for 1x API call.

---

### FR-005: Emergency Mechanisms
**User Story:** As a user, I need an escape hatch if TEE is unresponsive.

**Acceptance Criteria:**
- [ ] Emergency refund callable by user themselves (not admin)
- [ ] Trigger: Deadline passed (7 days) and state still Staked/Attesting (not Verified)
- [ ] Penalty: 5% of stake kept as gas compensation, 95% return
- [ ] State transition to Released after refund

**Risk:** Abuse. Mitigation: 5% penalty sufficient to deter.

---

### FR-006: Query Functions (View)
**User Story:** As an external agent, I need to verify skill credential without spending gas.

**Acceptance Criteria:**
- [ ] View function: Input (user address, topic string) → Output (boolean hasSkill, uint score, timestamp)
- [ ] View function: Input (user address, topic) → Output (full stake details including state and deadline)
- [ ] View function: Domain separator for EIP-712 signing preparation

**Performance:** View functions must be gas-efficient.

---

## 3.3 NON-FUNCTIONAL REQUIREMENTS (Quality Attributes)

### Security Requirements (Critical)
- **SR-001:** All state-changing functions transferring ETH must use ReentrancyGuard
- **SR-002:** Signature verification must use OpenZeppelin ECDSA library
- **SR-003:** Access control: TEE-only functions must strict check msg.sender == TEE_PUBLIC_KEY
- **SR-004:** Input validation: String topic max 64 bytes (anti-DOS), score max 100
- **SR-005:** Integer safety: Solidity 0.8+ built-in overflow check sufficient

### Gas Optimization Requirements
- **GR-001:** Calldata preferred over memory for external functions with string parameters
- **GR-002:** Custom errors (not string revert messages)
- **GR-003:** Storage packing: Group variables accessed together
- **GR-004:** Event parameters: Index only address and hash

### Upgradeability Constraints (Sovereign Constraint)
- **UR-001:** No proxy patterns (UUPS/Transparent/Beacon)
- **UR-002:** No selfdestruct capability
- **UR-003:** No admin functions after ownership renounced

---

## 3.4 INTERFACE SPECIFICATION (Contract API)

### External Write Functions
1. `stakeForChallenge(string topic)` - payable
2. `enrollTEE(address teePublicKey, bytes proofOfPossession)` - onlyDeployer
3. `activateTEE()` - onlyPendingTEE
4. `initiateChallenge(address user, string topic, bytes32 challengeCID)` - onlyTEE
5. `submitAttestation(address user, string topic, uint256 score, uint256 nonce, bytes signature)` - onlyTEE, nonReentrant
6. `emergencyRefund(string topic)` - user callable after timeout
7. `withdrawTreasury(uint256 amount, address to)` - onlyTEE

### External View Functions
1. `verifySkill(address user, string topic) returns (bool, uint256, uint256)`
2. `getStakeDetails(address user, string topic) returns (StakeInfo memory)`
3. `getDomainSeparator() returns (bytes32)`
4. `getTreasuryBalance() returns (uint256)`

### Events
1. `StakeDeposited(address indexed user, bytes32 indexed topicHash, uint128 amount, uint256 stakeId, uint40 deadline)`
2. `ChallengeInitiated(address indexed user, bytes32 indexed topicHash, bytes32 challengeCID, uint40 expiry)`
3. `AttestationSubmitted(address indexed user, bytes32 indexed topicHash, uint96 score, bytes32 indexed attestationHash)`
4. `StakeReleased(address indexed user, bytes32 indexed topicHash, uint256 userPayout, uint256 teeFee)`
5. `TEEActivated(address indexed teeAddress)`
6. `TreasuryWithdrawn(address indexed tee, uint256 amount, address to)`

### Custom Errors
- `InvalidTopicLength(uint256 provided, uint256 max)`
- `InvalidStakeAmount(uint256 provided, uint256 required)`
- `InvalidState(uint8 current, uint8 required)`
- `SignatureExpired(uint256 deadline, uint256 current)`
- `InvalidSignature()`
- `ChallengeNotExpired(uint256 deadline)`
- `TransferFailed()`

---

## 3.5 STATE MACHINE SPECIFICATION

**Allowed Transitions:**
- `Idle` → `Staked`: Via `stakeForChallenge()`
- `Staked` → `Attesting`: Via `initiateChallenge()`
- `Staked` → `Released`: Via `emergencyRefund()` (timeout)
- `Attesting` → `Verified`: Via `submitAttestation()`
- `Attesting` → `Released`: Via `emergencyRefund()` (timeout)
- `Verified` → `Released`: Automatic in `submitAttestation()`

**Forbidden Transitions:**
- Staked → Verified
- Verified → Staked
- Released → Any state

**State Variables:**
- Mapping: user address → topic hash → StakeInfo struct
- Mapping: user address → topic hash → Attestation struct

---

## 3.6 DATA MODEL SPECIFICATION

**Entity 1: StakeInfo**
- amount (uint128)
- stakedAt (uint40)
- challengeDeadline (uint40)
- challengeHash (bytes20)
- state (uint8)
- attemptNumber (uint8)

**Entity 2: Attestation**
- topicHash (bytes32)
- score (uint96)
- timestamp (uint40)
- attemptCount (uint16)
- isValid (bool)
- signature (bytes)
- attestor (address)

**Global State:**
- TEE_PUBLIC_KEY (address)
- pendingTEE (address)
- deployer (address)

---

## 3.7 RISK REGISTER & MITIGATION

| Risk ID | Description | Probability | Impact | Mitigation Strategy |
|---------|-------------|-------------|---------|---------------------|
| R-001 | TEE key compromised after activation | Low | Critical | Immutable = deploy new. Acceptable for MVP. |
| R-002 | Signature replay attack | Medium | High | EIP-712 + nonce tracking + domain separator |
| R-003 | Reentrancy on payout | Medium | Critical | ReentrancyGuard + CEI pattern |
| R-004 | Fund lock | Medium | Medium | Emergency refund with 7-day timeout |
| R-005 | Contract size > 24KB | Medium | Critical | Optimizer enabled, custom errors |
| R-006 | Wrong TEE address | Low | Critical | Two-step enrollment + Proof of Possession |
| R-007 | Integer division truncation | High | Low | Document rounding behavior |

---

## 3.8 ACCEPTANCE CRITERIA CHUNK 3 (Definition of Done)

- [x] **Spec Complete:** All FRs documented
- [x] **Architecture Locked:** State machine and economic model final
- [x] **Security Review:** SRs acknowledged
- [x] **Interface Final:** Function signatures frozen
- [x] **Risk Acknowledged:** R-001 to R-007 understood
- [x] **Tooling Ready:** Foundry/Hardhat ready
- [x] **No Code Yet:** Only spec doc produced
