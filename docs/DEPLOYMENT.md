# Deployment Documentation

## Overview

This document provides deployment details for the RTFM-Sovereign platform, including smart contract deployment, TEE service deployment, frontend deployment, and verification steps for judges.

---

## Deployment Manifest

### Contract Deployment

| Component | Network | Address | Transaction Hash | Block Number |
|-----------|---------|---------|------------------|--------------|
| **RTFMVerifiableRegistry** | Sepolia (11155111) | `0x7006e886e56426Fbb942B479AC8eF5C47a7531f1` | `0x59f58379b24e2881280a7b8cab618102631d55549da742eaa378fe549ef68ace` | 10311757 |
| **RTFMFaucet** | Sepolia (11155111) | `0xA607F8A4E5c35Ca6a81623e4B20601205D1d7790` | `0xc596ba783a1bd9226921c333a1754c9f8af04ec819a690c63368aee83e7c3ea3` | 10311757 |

### Deployment Details

- **Deployer**: `0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48`
- **Contract Version**: 1.0.0
- **Solidity Version**: 0.8.24
- **Deployment Date**: 2026-02-22

---

## Smart Contract Deployment

### Prerequisites

- Node.js 18+
- Foundry (forge, cast, anvil)
- Sepolia ETH for deployment fees

### Deployment Steps

#### 1. Clone Repository

```bash
git clone https://github.com/your-org/RTFM-Sovereign.git
cd RTFM-Sovereign
```

#### 2. Install Dependencies

```bash
cd packages/contracts
npm install
```

#### 3. Configure Environment

Create `.env` file:

```env
PRIVATE_KEY=your_private_key
RPC_URL=https://sepolia.infura.io/v3/your_project_id
```

#### 4. Compile Contracts

```bash
forge build
```

#### 5. Deploy Registry Contract

```bash
forge script script/DeployRegistry.s.sol \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  -vvvv
```

#### 6. Deploy Faucet Contract

```bash
forge script script/DeployFaucet.s.sol \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  -vvvv
```

#### 7. Verify on Etherscan

```bash
forge verify-contract \
  0x7006e886e56426Fbb942B479AC8eF5C47a7531f1 \
  src/RTFMVerifiableRegistry.sol:RTFMVerifiableRegistry \
  --chain-id 11155111 \
  --watch
```

---

## TEE Service Deployment

### Prerequisites

- Docker 20+
- EigenCompute account (for production KMS)
- Cerebras API key
- Sepolia ETH for gas fees

### Deployment Steps

#### 1. Build Docker Image

```bash
cd apps/tee
docker build -t rtfm-tee-service:latest .
```

#### 2. Configure Environment Variables

Create `.env.production`:

```env
PORT=3000
CONTRACT_ADDRESS=0x7006e886e56426Fbb942B479AC8eF5C47a7531f1
RPC_URL=https://sepolia.infura.io/v3/your_project_id
CEREBRAS_API_KEY=your_cerebras_api_key
MNEMONIC=your_mnemonic # Optional: use EigenCompute KMS in production
CHAIN_ID=11155111
LOG_LEVEL=info
```

#### 3. Deploy to EigenCompute

```bash
# Using EigenCompute CLI
eigencompute deploy \
  --image rtfm-tee-service:latest \
  --env-file .env.production \
  --region us-west-2 \
  --instance-type sgx.large
```

#### 4. Enroll TEE in Contract

After deployment, enroll the TEE's public key:

```typescript
// Generate TEE identity
const teeIdentity = new TEEIdentity();
const publicKey = teeIdentity.getPublicKey();
const address = teeIdentity.getAddress();
const proofOfPossession = teeIdentity.generateProofOfPossession();

// Call enrollTEE on contract
const tx = await contract.enrollTEE(address, proofOfPossession);
await tx.wait();
```

#### 5. Activate TEE

```typescript
// Activate TEE (renounces deployer rights)
const tx = await contract.activateTEE();
await tx.wait();
```

### Docker Compose (Local Development)

```yaml
version: '3.8'
services:
  tee-service:
    build: ./apps/tee
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - CONTRACT_ADDRESS=0x7006e886e56426Fbb942B479AC8eF5C47a7531f1
      - RPC_URL=https://sepolia.infura.io/v3/your_project_id
      - CEREBRAS_API_KEY=your_cerebras_api_key
      - CHAIN_ID=11155111
      - LOG_LEVEL=debug
    restart: unless-stopped
```

---

## Frontend Deployment

### Prerequisites

- Node.js 18+
- Vercel or Netlify account (for deployment)

### Deployment Steps

#### 1. Install Dependencies

```bash
cd apps/web
npm install
```

#### 2. Configure Environment

Create `.env.production`:

```env
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_CONTRACT_ADDRESS=0x7006e886e56426Fbb942B479AC8eF5C47a7531f1
NEXT_PUBLIC_TEE_URL=https://your-tee-service.com
NEXT_PUBLIC_RPC_URL=https://sepolia.infura.io/v3/your_project_id
```

#### 3. Build Application

```bash
npm run build
```

#### 4. Deploy to Vercel

```bash
vercel --prod
```

#### 5. Configure Domain (Optional)

- Add custom domain in Vercel dashboard
- Update DNS records as instructed by Vercel

---

## Verification Steps for Judges

### 1. Verify Contract Deployment

#### Step 1.1: Verify Contract Existence

```bash
# Using cast (Foundry)
cast code 0x7006e886e56426Fbb942B479AC8eF5C47a7531f1 \
  --rpc-url https://sepolia.infura.io/v3/your_project_id
```

Expected output: Non-empty bytecode (0x-prefixed hex string)

#### Step 1.2: Verify on Etherscan

Visit: https://sepolia.etherscan.io/address/0x7006e886e56426Fbb942B479AC8eF5C47a7531f1

Verify:
- Contract is verified
- Source code matches repository
- Constructor parameters match deployment

#### Step 1.3: Verify TEE Enrollment

```bash
# Check TEE public key
cast call 0x7006e886e56426Fbb942B479AC8eF5C47a7531f1 \
  "TEE_PUBLIC_KEY()(address)" \
  --rpc-url https://sepolia.infura.io/v3/your_project_id
```

Expected output: Non-zero address

---

### 2. Verify TEE Service

#### Step 2.1: Check TEE Identity

```bash
curl https://your-tee-service.com/identity
```

Expected response:

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

#### Step 2.2: Verify TEE Address Matches Contract

Compare the `address` field from Step 2.1 with the `TEE_PUBLIC_KEY` from Step 1.3. They must match.

#### Step 2.3: Check Service Health

```bash
curl https://your-tee-service.com/health
```

Expected response:

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

### 3. Verify End-to-End Flow

#### Step 3.1: Test Challenge Generation

```bash
curl -X POST https://your-tee-service.com/challenge/generate \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48",
    "topic": "Test Topic"
  }'
```

Expected response: Challenge object with modules and questions

#### Step 3.2: Test Attestation Flow

```bash
curl -X POST https://your-tee-service.com/attest \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48",
    "topic": "Test Topic",
    "challengeId": "0x8a3f2e1c4b6d7f9a0e2c4b6d8f0a2c4e6b8d0f2a4c6e8f0a2b4c6d8e0f2a4b6",
    "answers": [
      {"questionId": "q1", "answer": "Test answer"}
    ]
  }'
```

Expected response: Attestation with signature

#### Step 3.3: Verify On-Chain Attestation

```bash
# Check attestation on contract
cast call 0x7006e886e56426Fbb942B479AC8eF5C47a7531f1 \
  "verifySkill(address,string)(bool,uint256,uint256)" \
  0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48 \
  "Test Topic" \
  --rpc-url https://sepolia.infura.io/v3/your_project_id
```

Expected output: `(true, [score], [timestamp])`

---

### 4. Verify Frontend

#### Step 4.1: Access Frontend

Visit: https://your-frontend.vercel.app

Verify:
- Page loads without errors
- Connect Wallet button works
- Challenge generation works
- Attestation submission works

#### Step 4.2: Test Web3 Integration

1. Click "Connect Wallet"
2. Select wallet (MetaMask, etc.)
3. Verify wallet connects successfully
4. Check that correct network (Sepolia) is selected

---

## Post-Deployment Checklist

### Contract Verification

- [ ] Contract address verified on Etherscan
- [ ] Source code verified
- [ ] TEE public key enrolled
- [ ] TEE activated (deployer renounced)
- [ ] Constants match specifications:
  - [ ] STAKE_AMOUNT = 0.001 ether
  - [ ] TIMEOUT_DURATION = 7 days
  - [ ] SCORE_THRESHOLD = 70
  - [ ] TREASURY_FEE_BPS = 2000

### TEE Service Verification

- [ ] Service responds to `/health` endpoint
- [ ] Service responds to `/identity` endpoint
- [ ] TEE address matches contract
- [ ] Challenge generation works
- [ ] Attestation signing works
- [ ] AI services configured (Cerebras, Groq fallback)

### Frontend Verification

- [ ] Frontend accessible via HTTPS
- [ ] Environment variables configured
- [ ] Wallet connection works
- [ ] Challenge flow works
- [ ] Attestation flow works
- [ ] Verification query works

### Integration Verification

- [ ] End-to-end flow tested
- [ ] Attestations verifiable on-chain
- [ ] EIP-712 signatures valid
- [ ] Economic distribution correct (80% user, 20% treasury)
- [ ] Emergency refund works

---

## Monitoring

### Contract Monitoring

Key metrics to monitor:
- Total stakes
- Total attestations
- Treasury balance
- Average challenge time
- Emergency refund rate

### TEE Service Monitoring

Key metrics to monitor:
- Uptime
- Response time
- Error rate
- Challenge generation success rate
- AI service availability

### Frontend Monitoring

Key metrics to monitor:
- Page load time
- User engagement
- Conversion rate (stake to attestation)
- Error rate

---

## Maintenance

### Contract Upgrades

The current implementation is not upgradeable. To upgrade:

1. Deploy new contract version
2. Migrate data (if needed)
3. Update frontend and TEE service
4. Communicate upgrade to users

### TEE Key Rotation

To rotate TEE keys:

1. Generate new key in enclave
2. Call `enrollTEE` with new public key
3. Activate new TEE
4. Decommission old TEE

### AI Provider Failover

The circuit breaker pattern automatically fails over to fallback providers. Monitor logs to ensure smooth transitions.

---

## Troubleshooting

### Contract Issues

**Issue**: Transaction fails with "InvalidState"

**Solution**: Verify stake state using `getStakeDetails`

**Issue**: "InvalidSignature" error

**Solution**: Verify TEE public key matches contract

### TEE Service Issues

**Issue**: Challenge generation fails

**Solution**: Check AI provider status and API key

**Issue**: Attestation signing fails

**Solution**: Verify key material in enclave

### Frontend Issues

**Issue**: Wallet connection fails

**Solution**: Check network configuration (Sepolia)

**Issue**: Challenge not displaying

**Solution**: Check TEE service health and CORS settings

---

## Rollback Procedures

### Contract Rollback

If critical bug discovered:

1. Pause new stakes (if pause mechanism available)
2. Announce to users
3. Deploy fixed contract
4. Migrate stakes to new contract
5. Update frontend and TEE

### TEE Service Rollback

```bash
# Deploy previous Docker image
docker tag rtfm-tee-service:previous rtfm-tee-service:latest
docker-compose up -d --force-recreate
```

### Frontend Rollback

```bash
# Rollback to previous deployment on Vercel
vercel rollback --scope=production
```

---

## Security Considerations

### Private Key Management

- Never commit private keys to version control
- Use environment variables for sensitive data
- Rotate keys regularly
- Use hardware wallets for contract ownership

### Access Control

- Restrict admin access to TEE service
- Use strong authentication for deployment
- Monitor access logs
- Implement IP whitelisting where appropriate

### Rate Limiting

- Implement rate limiting on TEE service
- Monitor for suspicious activity
- Use Web3 provider rate limits

---

## Contact & Support

- **Technical Support**: support@rtfm-sovereign.com
- **Security Issues**: security@rtfm-sovereign.com
- **Documentation**: https://docs.rtfm-sovereign.com
- **Discord**: https://discord.gg/rtfm-sovereign

---

**Document Version**: 1.0  
**Last Updated**: 2026-02-22  
**Deployment Status**: Production (Sepolia Testnet)
