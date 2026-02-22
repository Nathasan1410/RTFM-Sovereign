# RTFM-Sovereign User Guide

## Quick Start (5 Minutes)

### Prerequisites
- MetaMask browser extension installed
- Sepolia testnet ETH (get from faucet)
- Web3-compatible browser (Chrome, Brave, Firefox)

### Get Started
1. Visit the live demo: [https://rtfm-sovereign.vercel.app](https://rtfm-sovereign.vercel.app)
2. Click "Connect Wallet" in the top-right corner
3. Approve MetaMask connection request

### Get Test Funds
1. Click the "Faucet" button in the app
2. Or visit [Sepolia Faucet](https://sepoliafaucet.com)
3. Receive 0.01-0.05 SEP to start testing

---

## The Workflow (Step-by-Step)

### Step 1: Connect Wallet
1. Click "Connect Wallet" button
2. Select MetaMask from the popup
3. Approve the connection request
4. Your address should appear in the top-right corner

![Connect Wallet](docs/screenshots/01-connect.png)
*Step 1: Connect MetaMask to Sepolia*

### Step 2: Get Test Funds
1. Navigate to the Faucet page
2. Enter your wallet address (auto-filled if connected)
3. Click "Request Drip"
4. Wait for transaction confirmation (10-30 seconds)
5. Check your wallet balance

![Faucet](docs/screenshots/02-faucet.png)
*Step 2: Get 0.01 ETH from faucet*

### Step 3: Stake & Challenge
1. Go to the "Challenges" page
2. Enter a skill topic (e.g., "Rust Programming", "Solidity")
3. Click "Start Challenge"
4. MetaMask will prompt you to stake 0.001 ETH
5. Confirm the transaction
6. Your challenge is now active!

![Stake Dialog](docs/screenshots/03-stake.png)
*Step 2: Stake 0.001 ETH for topic "Solidity"*

### Step 4: Complete Challenge
1. View the generated learning roadmap
2. Read the documentation links provided
3. Answer the challenge questions
4. Submit your answers before the 24-hour deadline

![Challenge View](docs/screenshots/04-challenge.png)
*Step 4: Complete the challenge questions*

### Step 5: Verify Attestation
1. Wait for TEE verification (usually 1-2 minutes)
2. Check your "Credentials" page
3. View your verified skill on Etherscan
4. Score ≥ 70 means you passed!

![Credential](docs/screenshots/05-credential.png)
*Step 5: View your verified credential*

### Step 6: Withdraw/Refund (Optional)
1. If you don't complete the challenge within 7 days
2. Click "Emergency Refund" on your stake
3. Receive 95% of your stake back (5% penalty)

---

## For Developers (Integration Guide)

### How to Query Skill Verification

**Example using ethers.js:**
```javascript
import { ethers } from 'ethers';

const registryAddress = '0x...'; // From DEPLOYMENTS.md
const registryABI = [...]; // From ABIs folder

const provider = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/YOUR_KEY');
const registry = new ethers.Contract(registryAddress, registryABI, provider);

// Verify a user's skill
const (hasSkill, score, timestamp) = await registry.verifySkill(
  userAddress,
  "Solidity"
);

console.log(`Has Skill: ${hasSkill}, Score: ${score}, Verified: ${timestamp}`);
```

**Example using Web3.py:**
```python
from web3 import Web3

w3 = Web3(Web3.HTTPProvider('https://sepolia.infura.io/v3/YOUR_KEY'))
registry = w3.eth.contract(address='0x...', abi=abi)

# Verify a user's skill
has_skill, score, timestamp = registry.functions.verifySkill(
    user_address,
    "Solidity"
).call()

print(f"Has Skill: {has_skill}, Score: {score}")
```

### API Endpoint for Verify Skill

**GET** `/api/verify-skill?address=0x...&topic=Solidity`

**Response:**
```json
{
  "hasSkill": true,
  "score": 85,
  "timestamp": 1709184000,
  "etherscanUrl": "https://sepolia.etherscan.io/tx/0x..."
}
```

---

## FAQ

### Q: Why testnet?
A: For safety! Testnet lets you try the application without risking real money. All transactions use Sepolia ETH which has no real value.

### Q: How long is the timeout?
A: **7 days** for the production version. For demo purposes, we may use a shorter timeout (10 minutes) to showcase the emergency refund mechanism.

### Q: What happens if the TEE is down?
A: Don't worry! The **emergency refund mechanism** allows you to withdraw 95% of your stake after the 7-day timeout if the TEE doesn't respond.

### Q: Is my data private?
A: Yes! RTFM-Sovereign follows a **local-first** architecture. All your roadmaps and progress are stored locally in your browser (IndexedDB). TEE attestation ensures verifiable execution without storing personal data on our servers.

### Q: Can I retry if I fail?
A: Absolutely! If you score below 70, you receive 80% of your stake back and can try again on the same topic.

### Q: Who controls the contracts?
A: No one! Once deployed, the contracts are **immutable and ownerless**. The TEE agent operates autonomously, and there's no admin who can change the rules or confiscate funds.

---

## Troubleshooting

### "Transaction Underpriced" Error
- Solution: Wait for gas prices to drop, or increase gas limit in MetaMask

### "Insufficient Funds" Error
- Solution: Get more ETH from the faucet

### Challenge Not Appearing
- Solution: Refresh the page and check your transaction on Etherscan

### TEE Verification Taking Too Long
- Solution: Check the TEE health endpoint at `/api/health`. If down, use emergency refund after timeout.

---

## Need Help?

- **GitHub Issues**: [https://github.com/yourusername/rtfm-sovereign/issues](https://github.com/yourusername/rtfm-sovereign/issues)
- **Documentation**: [ARCHITECTURE.md](ARCHITECTURE.md)
- **API Reference**: [API.md](API.md)
