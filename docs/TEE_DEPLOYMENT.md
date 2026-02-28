# TEE Deployment Guide - EigenCloud

**Last Updated**: February 28, 2026  
**Status**: ✅ Production Deployed

---

## Quick Reference

| Parameter | Value |
|-----------|-------|
| **App ID** | `0xaA7EFAfc5BB58198B6d9c93A342a89dF53Cce702` |
| **TEE Endpoint** | `http://136.109.176.251:3001` |
| **Instance Type** | `g1-standard-4t` (4 vCPUs, 16 GB memory, TDX) |
| **Network** | Sepolia Testnet (Chain ID: 11155111) |
| **Dashboard** | [View App](https://verify-sepolia.eigencloud.xyz/app/0xaA7EFAfc5BB58198B6d9c93A342a89dF53Cce702) |

---

## Pre-Deployment Checklist

- [ ] Node.js 18+ and pnpm installed
- [ ] EigenCloud CLI installed (`npm install -g @layr-labs/ecloud-cli`)
- [ ] Authenticated with EigenCloud (`ecloud auth login`)
- [ ] Environment files configured (`.env.production`)
- [ ] Git repository accessible
- [ ] Contract addresses configured

---

## Deployment Steps

### 1. Install EigenCloud CLI

```bash
npm install -g @layr-labs/ecloud-cli
ecloud version
```

### 2. Authenticate

```bash
ecloud auth login
ecloud auth whoami
```

### 3. Configure Environment

Ensure `apps/tee/.env.production` has:

```env
# Contract Addresses
CONTRACT_ATTESTATION=0x621218a5C6Ef20505AB37D8b934AE83F18CD778d
CONTRACT_STAKING=0xAc9Ad4A5e01e4351BD42d60858557cAEe0F50F73

# TEE Identity
TEE_PRIVATE_KEY=0x<your-tee-private-key>
WALLET_PRIVATE_KEY=0x<your-wallet-private-key>

# Network
RPC_URL=https://1rpc.io/sepolia
CHAIN_ID=11155111

# AI Providers
GROQ_API_KEY=<your-groq-key>
SERPER_API_KEY=<your-serper-key>

# IPFS
PINATA_API_KEY=<your-pinata-key>
PINATA_SECRET_API_KEY=<your-pinata-secret>
PINATA_JWT=<your-pinata-jwt>
```

### 4. Deploy to EigenCloud

```bash
cd D:\Projekan\Eigen-Layer-Hackathon

ecloud compute app deploy \
  --name rtfm-tee \
  --instance-type g1-standard-4t \
  --log-visibility private \
  --resource-usage-monitoring enable \
  --verifiable \
  --repo https://github.com/Nathasan1410/RTFM-Sovereign.git \
  --commit <latest-commit-sha> \
  --build-dockerfile apps/tee/Dockerfile.ecloud \
  --env-file apps/tee/.env.production \
  --skip-profile
```

### 5. Monitor Deployment

```bash
# Watch build logs
ecloud compute app logs --watch

# Check app status
ecloud compute app info

# View app details
ecloud compute app list
```

---

## Post-Deployment

### Test Endpoints

```bash
# Health check
curl http://136.109.176.251:3001/health

# Get TEE info (public key for contract enrollment)
curl http://136.109.176.251:3001/tee-info

# Test attestation
curl -X POST http://136.109.176.251:3001/attest \
  -H "Content-Type: application/json" \
  -d '{"topic": "test", "user": "0x..."}'
```

### Update Frontend Configuration

Update `apps/web/.env.development` and `apps/web/.env.production`:

```env
NEXT_PUBLIC_TEE_URL=http://136.109.176.251:3001
NEXT_PUBLIC_REGISTRY_CONTRACT=0x621218a5C6Ef20505AB37D8b934AE83F18CD778d
NEXT_PUBLIC_FAUCET_CONTRACT=0xAc9Ad4A5e01e4351BD42d60858557cAEe0F50F73
```

### Enroll TEE on Smart Contract

1. Get TEE public key:
```bash
curl http://136.109.176.251:3001/tee-info
```

2. Enroll TEE (from deployer wallet):
```bash
cast send 0x621218a5C6Ef20505AB37D8b934AE83F18CD778d \
  "enrollTEE(address,bytes)" \
  <TEE_PUBLIC_KEY> "0x" \
  --rpc-url https://1rpc.io/sepolia \
  --private-key <DEPLOYER_PRIVATE_KEY>
```

3. Activate TEE (from TEE wallet):
```bash
cast send 0x621218a5C6Ef20505AB37D8b934AE83F18CD778d \
  "activateTEE()" \
  --rpc-url https://1rpc.io/sepolia \
  --private-key <TEE_PRIVATE_KEY>
```

4. Renounce ownership (optional, burns deployer rights):
```bash
cast send 0x621218a5C6Ef20505AB37D8b934AE83F18CD778d \
  "renounceOwnership()" \
  --rpc-url https://1rpc.io/sepolia \
  --private-key <DEPLOYER_PRIVATE_KEY>
```

---

## App Management

### View Logs

```bash
# Real-time logs
ecloud compute app logs --watch

# Last 100 lines
ecloud compute app logs --tail 100
```

### Stop/Start App

```bash
# Stop app
ecloud compute app stop rtfm-tee

# Start app
ecloud compute app start rtfm-tee

# Terminate app (permanent)
ecloud compute app terminate rtfm-tee
```

### Upgrade Deployment

```bash
# Deploy new version
ecloud compute app upgrade rtfm-tee
```

---

## Troubleshooting

### App Not Starting

1. Check logs: `ecloud compute app logs --watch`
2. Verify environment variables are correct
3. Check if TEE_PRIVATE_KEY has Sepolia ETH for gas

### Build Fails

1. Verify Dockerfile.ecloud is correct
2. Check if all dependencies are in package.json
3. Ensure TypeScript compilation works locally

### Endpoint Not Responding

1. Wait 1-2 minutes after deployment for app to start
2. Check app status: `ecloud compute app info`
3. Verify instance type has enough resources

### Contract Enrollment Fails

1. Verify TEE public key matches the wallet
2. Ensure deployer wallet owns the contract
3. Check contract hasn't been renounced already

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (Next.js)                                     │
│  - User Interface                                       │
│  - Wallet Connection                                    │
│  - Challenge Display                                    │
└───────────────────┬─────────────────────────────────────┘
                    │ HTTP/REST
┌───────────────────▼─────────────────────────────────────┐
│  TEE Service (EigenCloud)                               │
│  - AI-Powered Roadmap Generation                        │
│  - Challenge Verification                               │
│  - Cryptographic Attestation                            │
│  - SGX/TDX Enclave                                      │
└───────────────────┬─────────────────────────────────────┘
                    │ Ethereum Transactions
┌───────────────────▼─────────────────────────────────────┐
│  Smart Contracts (Sepolia)                              │
│  - RTFMVerifiableRegistry                               │
│  - RTFMFaucet                                           │
│  - On-chain Attestation Verification                    │
└─────────────────────────────────────────────────────────┘
```

---

## Security Considerations

### Private Keys

- Never commit `.env` files to version control
- Use separate wallets for deployer and TEE
- Store production keys in secrets manager

### TEE Attestation

- TEE runs in Intel TDX enclave
- Remote attestation provides proof of execution
- Private keys sealed in enclave memory

### Smart Contracts

- Contracts verified on Etherscan
- Ownership renounced after TEE activation
- 7-day timeout for emergency refunds

---

## Cost Breakdown

### Deployment Costs (Sepolia Testnet)

| Operation | Gas Cost | ETH (approx) |
|-----------|----------|--------------|
| Deploy App to EigenCloud | - | Free (testnet) |
| Enroll TEE | ~50k gas | ~0.0005 ETH |
| Activate TEE | ~30k gas | ~0.0003 ETH |
| Renounce Ownership | ~30k gas | ~0.0003 ETH |

### Running Costs

- **EigenCloud Instance**: Free during hackathon
- **API Costs**: Groq, Serper, Pinata (free tiers)
- **Gas Costs**: User pays for their transactions

---

## Links & Resources

- **EigenCloud Console**: https://console.eigencloud.xyz
- **EigenCloud Docs**: https://docs.eigencloud.xyz
- **Sepolia Faucet**: https://sepoliafaucet.com
- **Etherscan Sepolia**: https://sepolia.etherscan.io
- **GitHub Repo**: https://github.com/Nathasan1410/RTFM-Sovereign

---

## Support

For issues and questions:

1. Check logs: `ecloud compute app logs`
2. Review troubleshooting section above
3. Open GitHub issue
4. Contact EigenCloud support

---

*Built for EigenLayer Hackathon 2026*
