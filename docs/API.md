# API Documentation

## Overview

This document describes the REST API endpoints provided by the TEE service and the smart contract interface for the RTFM-Sovereign platform.

---

## REST API Endpoints

### Base URL

```
https://tee-service.example.com
```

### Common Headers

| Header | Value | Description |
|--------|-------|-------------|
| `Content-Type` | `application/json` | Request body format |
| `Accept` | `application/json` | Response format expected |

---

## 1. Get TEE Identity

Retrieves the TEE's public key and attestation quote.

### Request

```http
GET /identity
```

### Response

```json
{
  "publicKey": "0x04a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890ab",
  "address": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  "contract": "0x7006e886e56426Fbb942B479AC8eF5C47a7531f1",
  "attestation": {
    "report": "BASE64_ENCODED_SGX_QUOTE",
    "signature": "MOCK_SIGNATURE_FROM_INTEL_SERVICE"
  },
  "version": "1",
  "status": "active"
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `publicKey` | string | TEE's uncompressed ECDSA public key (hex) |
| `address` | string | Ethereum address derived from public key |
| `contract` | string | Registry contract address |
| `attestation.report` | string | Base64-encoded SGX quote (production) |
| `attestation.signature` | string | Intel service signature |
| `version` | string | API version |
| `status` | string | Service status (`active` or `inactive`) |

---

## 2. Generate Challenge

Generates a deterministic AI challenge based on user address and topic.

### Request

```http
POST /challenge/generate
Content-Type: application/json
```

```json
{
  "userAddress": "0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48",
  "topic": "Solidity Smart Contract Development"
}
```

### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userAddress` | string | Yes | Ethereum address (0x-prefixed) |
| `topic` | string | Yes | Challenge topic (1-64 characters) |

### Response (Success)

```json
{
  "challengeId": "0x8a3f2e1c4b6d7f9a0e2c4b6d8f0a2c4e6b8d0f2a4c6e8f0a2b4c6d8e0f2a4b6",
  "modules": [
    {
      "id": "module_1",
      "title": "Basic Solidity Concepts",
      "weight": 0.4,
      "questions": [
        {
          "id": "q1",
          "question": "What is the purpose of the `msg.sender` global variable in Solidity?",
          "type": "short_answer",
          "points": 10
        },
        {
          "id": "q2",
          "question": "Explain the difference between `public` and `external` function visibility.",
          "type": "short_answer",
          "points": 10
        }
      ]
    },
    {
      "id": "module_2",
      "title": "Security Best Practices",
      "weight": 0.6,
      "questions": [
        {
          "id": "q3",
          "question": "What is a reentrancy attack and how can it be prevented?",
          "type": "short_answer",
          "points": 15
        }
      ]
    }
  ],
  "totalPoints": 100,
  "timeLimit": 3600,
  "generatedAt": "2026-02-22T10:30:00Z"
}
```

### Response (Error)

```json
{
  "error": "Missing userAddress or topic"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `challengeId` | string | Unique challenge identifier |
| `modules` | array | Array of question modules |
| `modules[].id` | string | Module identifier |
| `modules[].title` | string | Module title |
| `modules[].weight` | number | Module weight in scoring (0-1) |
| `modules[].questions` | array | Array of questions |
| `modules[].questions[].id` | string | Question identifier |
| `modules[].questions[].question` | string | Question text |
| `modules[].questions[].type` | string | Question type (`short_answer`, `multiple_choice`) |
| `modules[].questions[].points` | number | Points for this question |
| `totalPoints` | number | Total possible points |
| `timeLimit` | number | Time limit in seconds |
| `generatedAt` | string | ISO 8601 timestamp |

### Error Codes

| Status | Error | Description |
|--------|-------|-------------|
| 400 | `Missing userAddress or topic` | Required fields missing |
| 400 | `INVALID_ADDRESS` | Invalid Ethereum address format |
| 500 | `Generation failed` | AI service failure |

---

## 3. Submit Attestation

Validates user answers, grades them, and returns a signed attestation.

### Request

```http
POST /attest
Content-Type: application/json
```

```json
{
  "userAddress": "0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48",
  "topic": "Solidity Smart Contract Development",
  "challengeId": "0x8a3f2e1c4b6d7f9a0e2c4b6d8f0a2c4e6b8d0f2a4c6e8f0a2b4c6d8e0f2a4b6",
  "answers": [
    {
      "questionId": "q1",
      "answer": "msg.sender represents the address of the account that called the current function."
    },
    {
      "questionId": "q2",
      "answer": "Public functions can be called internally and externally, while external functions can only be called externally."
    },
    {
      "questionId": "q3",
      "answer": "Reentrancy occurs when a contract calls an external contract which calls back into the original contract before the first call is complete. It can be prevented using the Checks-Effects-Interactions pattern or ReentrancyGuard."
    }
  ]
}
```

### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userAddress` | string | Yes | Ethereum address (0x-prefixed) |
| `topic` | string | Yes | Challenge topic |
| `challengeId` | string | Yes | Challenge identifier from `/challenge/generate` |
| `answers` | array | Yes | Array of answer objects |
| `answers[].questionId` | string | Yes | Question identifier |
| `answers[].answer` | string | Yes | User's answer text |

### Response (Success)

```json
{
  "success": true,
  "score": 85,
  "passed": true,
  "attestation": {
    "signature": "0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "nonce": "1",
    "deadline": 1740235200,
    "attestationHash": "0x9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6"
  },
  "signer": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
}
```

### Response (Failure)

```json
{
  "success": false,
  "score": 45,
  "passed": false,
  "attestation": {
    "signature": "0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "nonce": "2",
    "deadline": 1740235200,
    "attestationHash": "0x9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6"
  },
  "signer": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
}
```

### Response (Error)

```json
{
  "error": "Missing required fields"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Request success flag |
| `score` | number | Calculated score (0-100) |
| `passed` | boolean | Whether score meets threshold (≥70) |
| `attestation.signature` | string | EIP-712 signature (hex) |
| `attestation.nonce` | string | Nonce for replay protection |
| `attestation.deadline` | number | Signature expiry timestamp (Unix) |
| `attestation.attestationHash` | string | Hash of attestation data |
| `signer` | string | TEE's Ethereum address |

### Error Codes

| Status | Error | Description |
|--------|-------|-------------|
| 400 | `Missing required fields` | Required fields missing |
| 400 | `INVALID_ADDRESS` | Invalid Ethereum address format |
| 400 | `[REDACTED]` | Error with sensitive data (keys redacted) |

---

## 4. Health Check

Returns service health status.

### Request

```http
GET /health
```

### Response

```json
{
  "status": "healthy",
  "timestamp": "2026-02-22T10:30:00Z",
  "version": "1.0.0",
  "services": {
    "tee": "active",
    "ai": "active",
    "signer": "active"
  }
}
```

---

## Smart Contract Interface

### Contract Address

**Network**: Sepolia (Chain ID: 11155111)  
**Address**: `0x7006e886e56426Fbb942B479AC8eF5C47a7531f1`

### ABI (Application Binary Interface)

```json
[
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "user", "type": "address"},
      {"indexed": true, "internalType": "bytes32", "name": "topicHash", "type": "bytes32"},
      {"indexed": false, "internalType": "uint96", "name": "score", "type": "uint96"},
      {"indexed": true, "internalType": "bytes32", "name": "attestationHash", "type": "bytes32"}
    ],
    "name": "AttestationSubmitted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "user", "type": "address"},
      {"indexed": true, "internalType": "bytes32", "name": "topicHash", "type": "bytes32"},
      {"indexed": false, "internalType": "bytes32", "name": "challengeCID", "type": "bytes32"},
      {"indexed": false, "internalType": "uint40", "name": "expiry", "type": "uint40"}
    ],
    "name": "ChallengeInitiated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "user", "type": "address"},
      {"indexed": true, "internalType": "bytes32", "name": "topicHash", "type": "bytes32"},
      {"indexed": false, "internalType": "uint128", "name": "amount", "type": "uint128"},
      {"indexed": false, "internalType": "uint256", "name": "stakeId", "type": "uint256"},
      {"indexed": false, "internalType": "uint40", "name": "deadline", "type": "uint40"}
    ],
    "name": "StakeDeposited",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "user", "type": "address"},
      {"indexed": true, "internalType": "bytes32", "name": "topicHash", "type": "bytes32"},
      {"indexed": false, "internalType": "uint256", "name": "userPayout", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "teeFee", "type": "uint256"}
    ],
    "name": "StakeReleased",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "teeAddress", "type": "address"}
    ],
    "name": "TEEActivated",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "SCORE_THRESHOLD",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "STAKE_AMOUNT",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "TIMEOUT_DURATION",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "TREASURY_FEE_BPS",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "activateTEE",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "teePublicKey", "type": "address"},
      {"internalType": "bytes", "name": "proofOfPossession", "type": "bytes"}
    ],
    "name": "enrollTEE",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "string", "name": "topic", "type": "string"}
    ],
    "name": "emergencyRefund",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDomainSeparator",
    "outputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "", "type": "address"},
      {"internalType": "bytes32", "name": "", "type": "bytes32"}
    ],
    "name": "getStakeDetails",
    "outputs": [
      {"internalType": "uint128", "name": "amount", "type": "uint128"},
      {"internalType": "uint40", "name": "stakedAt", "type": "uint40"},
      {"internalType": "uint40", "name": "challengeDeadline", "type": "uint40"},
      {"internalType": "bytes20", "name": "challengeHash", "type": "bytes20"},
      {"internalType": "uint8", "name": "state", "type": "uint8"},
      {"internalType": "uint8", "name": "attemptNumber", "type": "uint8"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTreasuryBalance",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "user", "type": "address"},
      {"internalType": "string", "name": "topic", "type": "string"},
      {"internalType": "bytes32", "name": "challengeCID", "type": "bytes32"}
    ],
    "name": "initiateChallenge",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "user", "type": "address"},
      {"internalType": "string", "name": "topic", "type": "string"},
      {"internalType": "uint256", "name": "score", "type": "uint256"},
      {"internalType": "uint256", "name": "nonce", "type": "uint256"},
      {"internalType": "uint256", "name": "deadline", "type": "uint256"},
      {"internalType": "bytes", "name": "signature", "type": "bytes"}
    ],
    "name": "submitAttestation",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "string", "name": "topic", "type": "string"}
    ],
    "name": "stakeForChallenge",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "", "type": "address"},
      {"internalType": "bytes32", "name": "", "type": "bytes32"}
    ],
    "name": "stakes",
    "outputs": [
      {"internalType": "uint128", "name": "amount", "type": "uint128"},
      {"internalType": "uint40", "name": "stakedAt", "type": "uint40"},
      {"internalType": "uint40", "name": "challengeDeadline", "type": "uint40"},
      {"internalType": "bytes20", "name": "challengeHash", "type": "bytes20"},
      {"internalType": "enum IRTFMSovereign.State", "name": "state", "type": "uint8"},
      {"internalType": "uint8", "name": "attemptNumber", "type": "uint8"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "amount", "type": "uint256"},
      {"internalType": "address", "name": "to", "type": "address"}
    ],
    "name": "withdrawTreasury",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]
```

---

## Smart Contract Methods

### Write Methods

#### `stakeForChallenge(topic)`

Deposits stake to initiate a challenge.

| Parameter | Type | Description |
|-----------|------|-------------|
| `topic` | string | Challenge topic (1-64 chars) |
| `msg.value` | uint256 | Stake amount (must be 0.001 ETH) |

**Returns**: None  
**Emits**: `StakeDeposited` event

**Example (ethers.js v6)**:

```javascript
const tx = await contract.stakeForChallenge("Solidity Smart Contract Development", {
  value: ethers.parseEther("0.001")
});
await tx.wait();
```

---

#### `initiateChallenge(user, topic, challengeCID)`

Called by TEE to acknowledge and initiate a challenge.

| Parameter | Type | Description |
|-----------|------|-------------|
| `user` | address | User address |
| `topic` | string | Challenge topic |
| `challengeCID` | bytes32 | IPFS content identifier |

**Access**: `onlyTEE`  
**Returns**: None  
**Emits**: `ChallengeInitiated` event

---

#### `submitAttestation(user, topic, score, nonce, deadline, signature)`

Submits signed attestation and handles payout.

| Parameter | Type | Description |
|-----------|------|-------------|
| `user` | address | User address |
| `topic` | string | Challenge topic |
| `score` | uint256 | Calculated score (0-100) |
| `nonce` | uint256 | User nonce |
| `deadline` | uint256 | Signature expiry timestamp |
| `signature` | bytes | EIP-712 signature |

**Access**: `onlyTEE`  
**Returns**: None  
**Emits**: `AttestationSubmitted`, `StakeReleased` events

**Example (ethers.js v6)**:

```javascript
const tx = await contract.submitAttestation(
  "0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48",
  "Solidity Smart Contract Development",
  85,
  1,
  1740235200,
  "0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
);
await tx.wait();
```

---

#### `emergencyRefund(topic)`

Allows user to refund stake after timeout.

| Parameter | Type | Description |
|-----------|------|-------------|
| `topic` | string | Challenge topic |

**Returns**: None  
**Emits**: `StakeReleased` event

**Example (ethers.js v6)**:

```javascript
const tx = await contract.emergencyRefund("Solidity Smart Contract Development");
await tx.wait();
```

---

#### `enrollTEE(teePublicKey, proofOfPossession)`

Proposes a new TEE public key.

| Parameter | Type | Description |
|-----------|------|-------------|
| `teePublicKey` | address | TEE's Ethereum address |
| `proofOfPossession` | bytes | Proof of key possession |

**Access**: `onlyDeployer`  
**Returns**: None

---

#### `activateTEE()`

Accepts TEE role and renounces deployer rights.

**Access**: `onlyPendingTEE`  
**Returns**: None  
**Emits**: `TEEActivated` event

---

#### `withdrawTreasury(amount, to)`

Withdraws accumulated treasury fees.

| Parameter | Type | Description |
|-----------|------|-------------|
| `amount` | uint256 | Amount to withdraw |
| `to` | address | Recipient address |

**Access**: `onlyTEE`  
**Returns**: None  
**Emits**: `TreasuryWithdrawn` event

---

### Read Methods

#### `verifySkill(user, topic)`

Queries attestation status for a user and topic.

| Parameter | Type | Description |
|-----------|------|-------------|
| `user` | address | User address |
| `topic` | string | Challenge topic |

**Returns**: `(bool isValid, uint256 score, uint256 timestamp)`

**Example (ethers.js v6)**:

```javascript
const [isValid, score, timestamp] = await contract.verifySkill(
  "0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48",
  "Solidity Smart Contract Development"
);
console.log(`Verified: ${isValid}, Score: ${score}, Timestamp: ${timestamp}`);
```

---

#### `getStakeDetails(user, topic)`

Returns stake information for a user and topic.

| Parameter | Type | Description |
|-----------|------|-------------|
| `user` | address | User address |
| `topic` | string | Challenge topic |

**Returns**: `StakeInfo` struct

**Example (ethers.js v6)**:

```javascript
const stake = await contract.getStakeDetails(
  "0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48",
  "Solidity Smart Contract Development"
);
console.log(`Amount: ${stake.amount}, State: ${stake.state}`);
```

---

#### `getDomainSeparator()`

Returns the EIP-712 domain separator.

**Returns**: `bytes32`

**Example (ethers.js v6)**:

```javascript
const domainSeparator = await contract.getDomainSeparator();
console.log(`Domain Separator: ${domainSeparator}`);
```

---

#### `getTreasuryBalance()`

Returns the current treasury balance.

**Returns**: `uint256`

**Example (ethers.js v6)**:

```javascript
const balance = await contract.getTreasuryBalance();
console.log(`Treasury Balance: ${ethers.formatEther(balance)} ETH`);
```

---

## Events

### `StakeDeposited`

```solidity
event StakeDeposited(
  address indexed user,
  bytes32 indexed topicHash,
  uint128 amount,
  uint256 stakeId,
  uint40 deadline
);
```

---

### `ChallengeInitiated`

```solidity
event ChallengeInitiated(
  address indexed user,
  bytes32 indexed topicHash,
  bytes32 challengeCID,
  uint40 expiry
);
```

---

### `AttestationSubmitted`

```solidity
event AttestationSubmitted(
  address indexed user,
  bytes32 indexed topicHash,
  uint96 score,
  bytes32 indexed attestationHash
);
```

---

### `StakeReleased`

```solidity
event StakeReleased(
  address indexed user,
  bytes32 indexed topicHash,
  uint256 userPayout,
  uint256 teeFee
);
```

---

### `TEEActivated`

```solidity
event TEEActivated(address indexed teeAddress);
```

---

## Error Codes

| Error | Description |
|-------|-------------|
| `Unauthorized()` | Caller not authorized |
| `InvalidTopicLength(uint256, uint256)` | Topic length invalid |
| `InvalidStakeAmount(uint256, uint256)` | Stake amount incorrect |
| `TopicAlreadyStaked()` | Topic already staked |
| `InvalidState(uint8, uint8)` | Invalid state transition |
| `SignatureExpired(uint256, uint256)` | Signature expired |
| `InvalidSignature()` | Invalid signature |
| `TransferFailed()` | Transfer failed |
| `ChallengeNotExpired(uint256)` | Challenge not expired |
| `InsufficientTreasuryBalance()` | Insufficient treasury funds |

---

**Document Version**: 1.0  
**Last Updated**: 2026-02-22  
**Contract Version**: 1.0.0
