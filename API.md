# RTFM-Sovereign API Documentation

## Smart Contract API (Solidity Functions)

### Write Functions

| Function | Parameters | Access | Description | Gas (est) |
|-----------|-------------|---------|-------------|-------------|
| `stakeForChallenge` | `string topic` | Public + Payable | Stake ETH for skill topic | ~65k |
| `enrollTEE` | `address teePublicKey, bytes proofOfPossession` | Deployer Only (pre-activation) | Propose TEE address | ~50k |
| `activateTEE` | - | Pending TEE Only | Accept TEE role and burn deployer rights | ~30k |
| `initiateChallenge` | `address user, string topic, bytes32 challengeCID` | TEE Only | Start challenge for staked user | ~40k |
| `submitAttestation` | `address user, string topic, uint256 score, uint256 nonce, uint256 deadline, bytes signature` | TEE Only + NonReentrant | Submit signed score | ~120k |
| `emergencyRefund` | `string topic` | Staker Only (after timeout) | Refund after 7-day timeout | ~45k |
| `withdrawTreasury` | `uint256 amount, address to` | TEE Only | Withdraw accumulated fees | ~30k |

### View Functions

| Function | Parameters | Returns | Description |
|-----------|-------------|----------|-------------|
| `verifySkill` | `address user, string topic` | `(bool hasSkill, uint256 score, uint256 timestamp)` | Check credential validity |
| `getStakeDetails` | `address user, string topic` | `StakeInfo memory` | Full stake state including amount, deadline, state |
| `getDomainSeparator` | - | `bytes32` | EIP-712 domain separator for frontend signing |
| `getTreasuryBalance` | - | `uint256` | Current treasury balance (fees collected) |

### Events (For Frontend Indexing)

| Event | Indexed Parameters | Description |
|--------|------------------|-------------|
| `StakeDeposited` | `user (address)`, `topicHash (bytes32)` | New stake created with user, topic, amount |
| `ChallengeInitiated` | `user (address)`, `topicHash (bytes32)` | TEE started challenge for user |
| `AttestationSubmitted` | `user (address)`, `topicHash (bytes32)`, `attestationHash (bytes32)` | Score recorded on-chain |
| `StakeReleased` | `user (address)`, `topicHash (bytes32)` | Payout/refund completed |
| `TEEActivated` | `teeAddress (address)` | TEE enrolled and activated |
| `TreasuryWithdrawn` | `tee (address)`, `to (address)` | Treasury funds withdrawn |

### Custom Errors

| Error | Parameters | When Thrown |
|--------|-------------|--------------|
| `InvalidTopicLength` | `provided (uint256), max (uint256)` | Topic string length > 64 bytes or empty |
| `InvalidStakeAmount` | `provided (uint256), required (uint256)` | Stake amount != 0.001 ETH |
| `InvalidState` | `current (uint8), required (uint8)` | State transition not allowed |
| `SignatureExpired` | `deadline (uint256), current (uint256)` | Attestation deadline passed |
| `InvalidSignature` | - | Signature doesn't match TEE key |
| `ChallengeNotExpired` | `deadline (uint256)` | Emergency refund before timeout |
| `TransferFailed` | - | ETH transfer failed |
| `Unauthorized` | - | Caller not authorized |
| `TopicAlreadyStaked` | - | User already staked on this topic |
| `InsufficientTreasuryBalance` | - | Treasury balance insufficient for withdrawal |

---

## REST API (TEE Endpoints)

### Base URL
```
https://tee-instance.eigencloud.xyz
```
*Note: Actual URL will be determined after EigenCompute deployment in Chunk 6*

### Endpoints

#### POST /challenge/generate

Generate a learning challenge for a given topic.

**Request:**
```json
{
  "topic": "Solidity",
  "user": "0x...",
  "stakeId": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "challengeId": "ch_abc123",
  "questions": [
    {
      "id": 1,
      "question": "What is the difference between `public` and `external` visibility?",
      "type": "multiple-choice",
      "options": ["A", "B", "C", "D"]
    }
  ],
  "documentation": [
    "https://docs.soliditylang.org/...",
    "https://ethereum.org/..."
  ],
  "deadline": 1709184000
}
```

#### POST /challenge/verify

Submit user's answer and get signed attestation.

**Request:**
```json
{
  "user": "0x...",
  "topic": "rust",
  "answer": "The difference is...",
  "challengeId": "ch_abc123",
  "timestamp": 1709184000
}
```

**Response:**
```json
{
  "success": true,
  "score": 85,
  "signature": "0x...",
  "attestation": "bytes...",
  "nonce": 1,
  "deadline": 1709187600
}
```

#### GET /health

Check TEE service status.

**Response:**
```json
{
  "status": "operational",
  "version": "1.0.0",
  "uptime": 3600
}
```

#### GET /identity

Get TEE public key and attestation info.

**Response:**
```json
{
  "publicKey": "0x...",
  "attestation": {
    "report": "bytes...",
    "signature": "bytes..."
  },
  "version": "1"
}
```

---

## Frontend API Routes (Next.js)

### POST /api/challenge/create

Proxy to TEE for challenge generation.

**Request:**
```typescript
{
  topic: string;
  walletAddress: string;
}
```

**Response:**
```typescript
{
  challengeId: string;
  questions: Question[];
  documentation: string[];
  deadline: number;
}
```

### POST /api/challenge/submit

Proxy to TEE for answer verification.

**Request:**
```typescript
{
  challengeId: string;
  answers: string[];
  walletAddress: string;
}
```

**Response:**
```typescript
{
  score: number;
  passed: boolean;
  signature: string;
}
```

### POST /api/credential/verify

Submit attestation to smart contract.

**Request:**
```typescript
{
  user: string;
  topic: string;
  score: number;
  nonce: number;
  deadline: number;
  signature: string;
}
```

**Response:**
```typescript
{
  txHash: string;
  success: boolean;
}
```

### GET /api/skills/:address

Query user's verified skills.

**Response:**
```typescript
{
  skills: {
    topic: string;
    score: number;
    timestamp: number;
    etherscanUrl: string;
  }[];
}
```

---

## EIP-712 Typed Data Structure

### Type Definitions

```typescript
const types = {
  Attestation: [
    { name: 'user', type: 'address' },
    { name: 'topic', type: 'string' },
    { name: 'score', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' }
  ]
};
```

### Domain Separator

```typescript
const domain = {
  name: 'RTFMVerifiableRegistry',
  version: '1',
  chainId: 11155111, // Sepolia
  verifyingContract: '0x...', // Contract address
};
```

---

## Error Codes

### HTTP Status Codes

| Code | Meaning |
|-------|----------|
| 200 | Success |
| 400 | Bad Request (invalid parameters) |
| 401 | Unauthorized (invalid signature) |
| 404 | Not Found (challenge doesn't exist) |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error (TEE issue) |

### Solidity Revert Reasons

Common reverts and their meanings:

| Revert | Meaning | Fix |
|---------|----------|------|
| `InvalidTopicLength` | Topic too long (>64 chars) | Shorten topic name |
| `InvalidStakeAmount` | Stake != 0.001 ETH | Send exact amount |
| `InvalidState` | Wrong state for action | Check current stake state |
| `SignatureExpired` | Attestation deadline passed | Submit before deadline |
| `InvalidSignature` | Wrong TEE signature | Verify TEE public key |

---

## Testing Examples

### Using cURL

**Generate Challenge:**
```bash
curl -X POST https://tee-instance.eigencloud.xyz/challenge/generate \
  -H "Content-Type: application/json" \
  -d '{"topic": "Solidity", "user": "0x..."}'
```

**Verify Answer:**
```bash
curl -X POST https://tee-instance.eigencloud.xyz/challenge/verify \
  -H "Content-Type: application/json" \
  -d '{"user": "0x...", "topic": "rust", "answer": "..."}'
```

### Using Foundry (cast)

**Check Skill:**
```bash
cast call 0x... \
  "verifySkill(address,string)" \
  0x123... "Solidity" \
  --rpc-url $SEPOLIA_RPC
```

**Get Stake Details:**
```bash
cast call 0x... \
  "getStakeDetails(address,string)" \
  0x123... "Solidity" \
  --rpc-url $SEPOLIA_RPC
```

---

## Integration Checklist

Before integrating with RTFM-Sovereign, ensure:

- [ ] Wallet connected to Sepolia network (Chain ID: 11155111)
- [ ] Contract address verified on Etherscan
- [ ] ABI files imported correctly
- [ ] EIP-712 signing library configured (ethers.js/viem)
- [ ] Error handling for all revert reasons
- [ ] Event listeners for stake/attestation updates
- [ ] Gas estimation before transactions
