# User Guide

## Overview

Welcome to RTFM-Sovereign, a decentralized platform for verifying your technical skills through cryptographically attestable AI-generated challenges. This guide will help you get started as a user (candidate) or verifier (employer/recruiter).

---

## Quick Start for Users

### Prerequisites

- **Web3 Wallet**: MetaMask, WalletConnect, or compatible wallet
- **Sepolia ETH**: Testnet ETH for staking (0.001 ETH per challenge)
- **Ethereum Address**: Your wallet address

### Step 1: Access the Platform

Visit the RTFM-Sovereign frontend:

```
https://your-frontend.vercel.app
```

### Step 2: Connect Your Wallet

1. Click the "Connect Wallet" button in the top-right corner
2. Select your preferred wallet (MetaMask, WalletConnect, etc.)
3. Approve the connection request in your wallet
4. Ensure you're connected to the **Sepolia Testnet**

### Step 3: Get Testnet ETH

If you don't have Sepolia ETH:

1. Visit the [Sepolia Faucet](https://sepoliafaucet.com/)
2. Enter your wallet address
3. Request testnet ETH
4. Wait for confirmation (~1-2 minutes)

### Step 4: Select a Topic

1. Browse available topics on the dashboard
2. Select a topic you want to demonstrate knowledge in
3. Examples:
   - Solidity Smart Contract Development
   - React Frontend Development
   - TypeScript Fundamentals
   - Blockchain Basics

### Step 5: Stake for Challenge

1. Click "Start Challenge" on your selected topic
2. Review the stake amount (0.001 ETH)
3. Confirm the transaction in your wallet
4. Wait for confirmation (~15-30 seconds)

Your stake is now locked and the challenge period begins.

### Step 6: Complete the Challenge

1. The TEE service generates a challenge based on your address and topic
2. Review the challenge questions (typically 3-5 questions)
3. Answer each question to the best of your ability
4. Click "Submit Answers" when ready

### Step 7: Receive Attestation

1. The TEE service grades your answers
2. If you score 70+ points, you pass and receive:
   - **0.0008 ETH** (80% of stake) refunded
   - **Cryptographic attestation** stored on-chain
3. If you score below 70, you receive:
   - **0.0008 ETH** (80% of stake) refunded
   - **Failed attestation** recorded

The TEE keeps 20% (0.0002 ETH) as a service fee.

### Step 8: Share Your Attestation

1. View your attestation on the dashboard
2. Click "Share" to get a verification link
3. Share the link with employers, recruiters, or on your resume

---

## Quick Start for Verifiers

### Prerequisites

- **Web3 Wallet**: For signing verification requests (optional)
- **Candidate's Attestation**: Verification link or on-chain data

### Step 1: Access Verification

Option A: **Direct Link**
- Click the verification link shared by the candidate

Option B: **Manual Verification**
- Visit the platform
- Enter the candidate's wallet address
- Select the topic to verify

### Step 2: View Attestation Details

The verification page shows:
- **Candidate Address**: Cryptographic identifier
- **Topic**: Skill area verified
- **Score**: Points earned (0-100)
- **Timestamp**: When attestation was created
- **Status**: Passed (≥70) or Failed (<70)
- **TEE Signature**: Cryptographic proof of authenticity

### Step 3: Verify Cryptographically (Optional)

For advanced verification:

1. Check the **TEE Public Key** on-chain
2. Verify the **EIP-712 Signature**
3. Confirm the attestation hasn't been tampered with

### Step 4: Confirm Validity

The verification page will display:
- ✅ **Valid**: Attestation is cryptographically verified
- ❌ **Invalid**: Attestation signature or data is corrupted

---

## Using the Faucet

The RTFM-Sovereign platform includes a faucet for easy access to testnet ETH.

### Accessing the Faucet

Visit: https://your-frontend.vercel.app/faucet

### Requesting ETH

1. Enter your wallet address
2. Click "Request ETH"
3. Wait for confirmation
4. Receive 0.01 ETH (enough for 10 challenges)

### Faucet Rules

- **One request per address per 24 hours**
- **Maximum 0.01 ETH per request**
- **Sepolia testnet only**

---

## Understanding Attestations

### What is an Attestation?

An attestation is a cryptographically verifiable record of your skill level in a specific topic. It includes:

- **Your Wallet Address**: Unique identifier
- **Topic**: The skill area (e.g., "Solidity Development")
- **Score**: Your performance (0-100 points)
- **Timestamp**: When you completed the challenge
- **TEE Signature**: Cryptographic proof of authenticity

### Why Trust Attestations?

- **TEE Security**: Challenges generated and graded in a Trusted Execution Environment
- **Cryptographic Proof**: EIP-712 signatures ensure data integrity
- **On-Chain Storage**: Attestations stored on immutable blockchain
- **Deterministic AI**: Challenges reproducible via seed

### Attestation Validity

- **Score ≥ 70**: Passed attestation (valid for 6 months)
- **Score < 70**: Failed attestation (can retake after 7 days)
- **Expired**: Attestations older than 6 months marked as expired

---

## Retaking Challenges

### When Can You Retake?

You can retake a challenge if:
1. **Failed**: Your score was below 70
2. **Released**: Your previous stake has been refunded

### Retaking Process

1. Navigate to the topic page
2. Click "Retake Challenge"
3. Stake again (0.001 ETH)
4. Complete the new challenge
5. Receive new attestation

### Attempt Limits

- **No hard limit** on attempts
- **Each attempt** requires a new stake
- **Best score** is recorded on-chain

---

## Emergency Refund

If the TEE service becomes unresponsive, you can request an emergency refund after 7 days.

### Requesting Emergency Refund

1. Navigate to your active challenges
2. Click "Request Refund"
3. Confirm the transaction
4. Receive **0.00095 ETH** (95% of stake)
5. **0.00005 ETH** (5%) is kept as a penalty

### Refund Conditions

- **Challenge must be active** (not completed)
- **7 days must have passed** since staking
- **TEE must be unresponsive** (no attestation submitted)

---

## Verifying Attestations Programmatically

### Using ethers.js v6

```javascript
import { ethers } from 'ethers';

// Contract ABI (minimal)
const abi = [
  "function verifySkill(address user, string topic) view returns (bool isValid, uint256 score, uint256 timestamp)"
];

// Connect to contract
const provider = new ethers.JsonRpcProvider("https://sepolia.infura.io/v3/YOUR_PROJECT_ID");
const contract = new ethers.Contract(
  "0x7006e886e56426Fbb942B479AC8eF5C47a7531f1",
  abi,
  provider
);

// Verify attestation
const [isValid, score, timestamp] = await contract.verifySkill(
  "0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48",
  "Solidity Smart Contract Development"
);

console.log(`Valid: ${isValid}, Score: ${score}, Timestamp: ${new Date(timestamp * 1000).toISOString()}`);
```

### Using curl

```bash
# Get stake details
curl -X POST https://sepolia.infura.io/v3/YOUR_PROJECT_ID \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_call",
    "params": [
      {
        "to": "0x7006e886e56426Fbb942B479AC8eF5C47a7531f1",
        "data": "0x[function_signature]"
      },
      "latest"
    ],
    "id": 1
  }'
```

---

## Frequently Asked Questions (FAQs)

### General Questions

**Q: What is RTFM-Sovereign?**

A: RTFM-Sovereign is a decentralized platform for verifying technical skills through AI-generated challenges that are cryptographically attestable on-chain.

**Q: How much does it cost to verify a skill?**

A: Each challenge costs 0.001 ETH (~$2-3 USD on mainnet, free on testnet). You receive 80% back as a refund.

**Q: How long does a challenge take?**

A: Most challenges take 15-30 minutes to complete, depending on the topic and your knowledge level.

**Q: Can I retake a challenge if I fail?**

A: Yes! You can retake any challenge by staking again. There's no limit on attempts.

---

### Technical Questions

**Q: What network is RTFM-Sovereign deployed on?**

A: Currently deployed on Sepolia testnet. Mainnet deployment coming soon.

**Q: What is a TEE?**

A: TEE (Trusted Execution Environment) is a secure area of a processor that ensures code and data are protected. We use Intel SGX for cryptographic attestation.

**Q: How are challenges generated?**

A: Challenges are generated by AI (Cerebras) using a deterministic seed based on your address and topic, ensuring reproducibility.

**Q: What is EIP-712?**

A: EIP-712 is a standard for typed structured data signing. We use it to create cryptographic proofs of your attestation.

---

### Security Questions

**Q: Is my wallet address private?**

A: Your wallet address is public on the blockchain. We recommend using a professional wallet address for skill verification.

**Q: Can someone fake my attestation?**

A: No. Attestations are cryptographically signed by the TEE and stored on-chain, making them tamper-proof.

**Q: What happens if the TEE is compromised?**

A: The TEE's cryptographic keys are hardware-protected. In the unlikely event of compromise, we would deploy a new TEE and migrate attestations.

**Q: Is my challenge data private?**

A: Challenge content is generated in the TEE and only shared with you. Your answers are graded in the TEE and not stored publicly.

---

### Verification Questions

**Q: How do I share my attestation?**

A: Click "Share" on your attestation to get a verification link. Share this link with employers or recruiters.

**Q: How long is an attestation valid?**

A: Attestations are valid for 6 months from the date of issue. After that, they are marked as expired.

**Q: Can employers verify my attestation?**

A: Yes! Employers can verify your attestation via the verification link or by querying the contract directly.

**Q: What if an employer questions my attestation?**

A: Direct them to the verification link. They can verify the cryptographic signature and on-chain data themselves.

---

### Payment Questions

**Q: Why do I need to stake ETH?**

A: Staking ensures economic commitment and discourages spam. You receive 80% back regardless of outcome.

**Q: How do I get testnet ETH?**

A: Use the built-in faucet or visit [Sepolia Faucet](https://sepoliafaucet.com/).

**Q: What happens to the 20% fee?**

A: The 20% fee goes to the TEE operator for maintaining the service and paying AI provider costs.

**Q: Can I get a full refund?**

A: Full refunds are only available if the TEE is unresponsive for 7+ days (emergency refund).

---

### Troubleshooting

**Q: My transaction is pending/stuck. What should I do?**

A: Wait for network congestion to clear, or increase the gas price in your wallet settings.

**Q: I can't connect my wallet. What's wrong?**

A: Ensure you're on the correct network (Sepolia) and your wallet is unlocked. Try refreshing the page.

**Q: The challenge didn't load. What do I do?**

A: Check that the TEE service is healthy by visiting `/health`. If it's down, wait for it to come back online.

**Q: My score seems incorrect. Can I contest it?**

A: The grading is deterministic and performed by the TEE. If you believe there's an error, please contact support with your attestation hash.

---

## Best Practices

### For Candidates

1. **Use a Professional Wallet**: Keep your skill verification separate from your personal wallet
2. **Choose Topics Wisely**: Select topics you're genuinely knowledgeable in
3. **Read Questions Carefully**: Take your time to understand each question
4. **Provide Detailed Answers**: Explain your reasoning to maximize your score
5. **Keep Your Attestations**: Share verification links on your resume and LinkedIn

### For Verifiers

1. **Always Verify**: Don't trust screenshots - use the verification link
2. **Check Timestamps**: Ensure attestations are recent (within 6 months)
3. **Verify Cryptographically**: For high-value roles, verify the signature yourself
4. **Consider Context**: A single attestation is one data point - consider the whole profile

### For Both

1. **Stay Updated**: Follow our Discord for platform updates and new features
2. **Report Issues**: If you encounter bugs, please report them
3. **Contribute**: We welcome feedback and suggestions for improvement

---

## Support & Community

### Getting Help

- **Documentation**: https://docs.rtfm-sovereign.com
- **Discord**: https://discord.gg/rtfm-sovereign
- **Email**: support@rtfm-sovereign.com
- **Twitter**: @RTFMSovereign

### Contributing

We welcome contributions! Check out our GitHub repository:

```
https://github.com/your-org/RTFM-Sovereign
```

### Bug Bounties

Found a security issue? Report it to security@rtfm-sovereign.com for a bounty.

---

## Glossary

| Term | Definition |
|------|------------|
| **Attestation** | Cryptographically verified record of a skill assessment |
| **TEE** | Trusted Execution Environment (Intel SGX) |
| **EIP-712** | Ethereum Improvement Proposal for typed data signing |
| **Stake** | ETH locked as economic commitment |
| **Nonce** | Number used once for replay protection |
| **Circuit Breaker** | Fallback mechanism for service availability |
| **Deterministic** | Produces same output for same input (seed) |

---

**Document Version**: 1.0  
**Last Updated**: 2026-02-22  
**Platform Status**: Beta (Sepolia Testnet)
