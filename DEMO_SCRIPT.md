# RTFM-Sovereign Demo Script (Auto-Generated)

## Pre-Demo Checklist
- [ ] TEE service running (or Demo Mode enabled)
- [ ] MetaMask on Sepolia with 0.001+ ETH (if real mode)
- [ ] Browser: Chrome/Brave, zoom 100%
- [ ] DevTools Console open for monitoring

## Demo Flow (5 minutes)

### 1. Landing (30s)
- Open http://localhost:3000
- **Say:** "Welcome to RTFM-Sovereign, a verifiable skill protocol on EigenLayer"
- **Say:** "Traditional learning platforms have a credibility problem—anyone can claim skills without proof"
- **Say:** "RTFM-Sovereign solves this with cryptographic attestations backed by economic stake and AI verification"

### 2. Explore (30s)
- Click Explore
- Show React Card skill
- **Say:** "Browse available skills—React, Solidity, TypeScript—each with difficulty and estimated time"
- **Say:** "0.001 ETH stake to prove your React skills—skin in the game ensures commitment"

### 3. Stake (1m)
- Click Start Learning
- Connect MetaMask (or skip if Demo Mode: press Shift+D 3 times)
- **Say:** "I'm staking 0.001 ETH—about $2—to prove my React skills"
- **Say:** "This stake is locked in a smart contract on Sepolia. If I complete, I get 80% back. If I fail or abandon, it goes to protocol"
- Confirm transaction in MetaMask
- Show transaction on Etherscan (link appears)
- Wait for confirmation (15-30s on Sepolia)

### 4. Learn (2m)
- Monaco Editor appears with Step 1
- **Say:** "Now in the learning interface—Monaco Editor, same as VS Code"
- **Say:** "Five milestones, each building on the last. Step 1-2 off-chain practice, Step 3 checkpoint on-chain, Step 5 final attestation"
- Type sample code in editor
- Click Verify Code / Submit
- **Say:** "Our AI Judge—using EigenAI and AST analysis—scores on functionality (40%), quality (30%), best practices (20%), innovation (10%)"
- Wait for AI response (2 seconds)
- Show rubric breakdown panel
- **Say:** "85/100—I passed. The AI gives specific feedback: good structure, but add TypeScript interfaces"
- Click Next to unlock Step 2
- **Say:** "Score >=70 unlocks next milestone. Fail, and I need to improve based on AI feedback"

### 5. Verification (1m)
- Skip to final attestation (or show intermediate)
- Click "Verify Credential" or go to `/verify/YOUR_ADDRESS`
- **Say:** "After 5 milestones, I get my credential—not a PDF, but a cryptographic attestation on blockchain"
- Show verification page with score, timestamp, IPFS hash
- **Say:** "Employers can verify this forever. They see my score, AI rubric breakdown, code evolution on IPFS, and on-chain proof"
- Show Etherscan link for attestation transaction

### 6. Closing (30s)
- **Say:** "RTFM-Sovereign turns education into verifiable credentials"
- **Say:** "With EigenLayer's economic security and AI verification, we're building the future of skill attestation"
- **Say:** "Questions?"

## Backup Plans

### If MetaMask Fails
- **Say:** "Let me show you in Demo Mode—no real ETH required"
- Press Shift+D three times rapidly to toggle Demo Mode
- Reload page, continue with mock responses

### If TEE Slow
- **Say:** "The AI is analyzing—this usually takes 2 seconds on our optimized infrastructure"
- Use pre-completed session (if cached)
- Or wait and show patience indicator

### If All Fails
- Show Etherscan pre-staged transactions (from CHUNK 3 deployment)
- Show contract addresses and verification links
- Fall back to architecture explanation
- **Say:** "The smart contracts are live on Sepolia—here's SkillStaking and SkillAttestation—proving the protocol works even if frontend has issues"

## Emergency Protocols

### If MetaMask Hangs
- **Say:** "Sepolia is congested, let me show local demo"
- Switch to Demo Mode (Shift+D x3)

### If TEE Down
- **Say:** "The AI is analyzing—this usually takes 2 seconds"
- Demo Mode works without TEE, show mock responses

### If Total Failure
- **Say:** "Let me show you the codebase and pre-recorded video"
- Open GitHub repo
- Show recorded video (if prepared)

## Post-Demo Cleanup

- [ ] Disable Demo Mode (Shift+D x3 again)
- [ ] Clear browser localStorage
- [ ] Reset MetaMask network to mainnet
- [ ] Document any issues encountered

## Demo Metrics Tracking

| Phase | Time | Status | Notes |
|--------|-------|--------|--------|
| Landing | 30s | | |
| Explore | 30s | | |
| Stake | 1m | | |
| Learn | 2m | | |
| Verify | 1m | | |
| Closing | 30s | | |
| **Total** | **5m** | | |
