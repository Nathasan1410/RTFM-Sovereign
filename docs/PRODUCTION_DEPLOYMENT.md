# Production Deployment Checklist

## Pre-Deployment Verification

### Environment Setup
- [ ] Node.js >= 18.0.0 installed
- [ ] pnpm >= 8.0.0 installed
- [ ] Git configured
- [ ] Docker installed (for TEE deployment)
- [ ] Foundry installed (for contracts)

### Environment Variables
- [ ] Copy `.env.example` to `.env`
- [ ] Set `SEPOLIA_RPC_URL` with valid Alchemy/Infura endpoint
- [ ] Set `SEPOLIA_CHAIN_ID=11155111`
- [ ] Set contract addresses in `NEXT_PUBLIC_REGISTRY_CONTRACT` and `NEXT_PUBLIC_FAUCET_CONTRACT`
- [ ] Set `TEE_PRIVATE_KEY` (secure, never commit)
- [ ] Set `CEREBRAS_API_KEY` and `GROQ_API_KEY`
- [ ] Set `ETHERSCAN_API_KEY` for contract verification
- [ ] Set `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`
- [ ] Verify all secrets are in `.env` (not committed to git)

### Smart Contracts
- [ ] Run `pnpm contracts:compile`
- [ ] Run `pnpm contracts:test`
- [ ] Verify all tests pass
- [ ] Check gas estimates are acceptable
- [ ] Deploy to Sepolia testnet
- [ ] Verify contracts on Etherscan
- [ ] Record contract addresses in `DEPLOYMENTS.md`
- [ ] Enroll and activate TEE
- [ ] Renounce ownership

### TEE Service
- [ ] Build TEE Docker image: `pnpm tee:docker`
- [ ] Test TEE locally: `cd apps/tee && npm start`
- [ ] Verify `/health` endpoint responds
- [ ] Verify `/identity` endpoint returns public key
- [ ] Test challenge generation
- [ ] Test attestation signing
- [ ] Deploy to EigenCompute or production server
- [ ] Update `NEXT_PUBLIC_TEE_URL` in frontend env

### Frontend
- [ ] Run `pnpm web:lint`
- [ ] Run `pnpm web:typecheck`
- [ ] Run `pnpm web:dev` and test manually
- [ ] Run `pnpm test` (frontend tests)
- [ ] Build production: `pnpm web:build`
- [ ] Test production build locally: `pnpm web:start`
- [ ] Deploy to Vercel/Netlify
- [ ] Verify environment variables in hosting platform

---

## Deployment Commands

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Build All Packages
```bash
pnpm web:build
pnpm tee:build
pnpm contracts:compile
```

### 3. Run Tests
```bash
pnpm test
pnpm contracts:test
```

### 4. Deploy Smart Contracts
```bash
cd packages/contracts
forge script script/Deploy.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $DEPLOYER_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

### 5. Deploy TEE Service
```bash
cd apps/tee
docker build -f Dockerfile.tee -t rtfm-tee:latest .
docker push rtfm-tee:latest
# Deploy to EigenCompute or your container platform
```

### 6. Deploy Frontend
```bash
cd apps/web
pnpm build
# Deploy to Vercel
vercel --prod
```

---

## Post-Deployment Verification

### Smart Contracts
- [ ] Verify contract on Etherscan
- [ ] Check contract balance
- [ ] Test `stakeForChallenge()` with 0.001 ETH
- [ ] Test `verifySkill()` returns correct data
- [ ] Verify TEE is enrolled and active
- [ ] Confirm ownership is renounced

### TEE Service
- [ ] Health check: `curl https://tee.rtfm-sovereign.com/health`
- [ ] Identity check: `curl https://tee.rtfm-sovereign.com/identity`
- [ ] Test challenge generation endpoint
- [ ] Test attestation signing endpoint
- [ ] Monitor logs for errors
- [ ] Check response times (< 5s)

### Frontend
- [ ] Load homepage (check for errors)
- [ ] Connect wallet (test MetaMask/WalletConnect)
- [ ] Navigate to roadmap page
- [ ] Test staking flow
- [ ] Test challenge generation
- [ ] Test code submission
- [ ] Test attestation verification
- [ ] Check mobile responsiveness
- [ ] Verify PWA functionality
- [ ] Test on multiple browsers

### Performance
- [ ] Page load time < 3s
- [ ] Challenge generation < 5s
- [ ] Attestation signing < 3s
- [ ] Gas cost per stake < 100k
- [ ] Gas cost per attestation < 150k

---

## Monitoring Setup

### Error Tracking
- [ ] Set up Sentry DSN in `.env`
- [ ] Configure error reporting
- [ ] Test error capture

### Logging
- [ ] Set `LOG_LEVEL=info` (or `debug` for debugging)
- [ ] Configure log aggregation
- [ ] Set up alerts for critical errors

### Uptime Monitoring
- [ ] Set up uptime monitoring for:
  - Frontend: https://rtfm-sovereign.vercel.app
  - TEE: https://tee.rtfm-sovereign.com
  - Smart Contracts: Etherscan alerts

### Metrics to Track
| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Page Load Time | < 3s | > 5s |
| Challenge Generation | < 5s | > 10s |
| Error Rate | < 1% | > 5% |
| Uptime | > 99% | < 95% |
| Gas Cost | < 0.01 ETH | > 0.02 ETH |

---

## Security Checklist

### Smart Contracts
- [ ] ReentrancyGuard on all value transfers
- [ ] AccessControl properly configured
- [ ] No hardcoded private keys
- [ ] Ownership renounced
- [ ] Emergency refund mechanism tested
- [ ] Signature verification tested

### TEE Service
- [ ] Private keys sealed in SGX enclave
- [ ] TLS enabled for all endpoints
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] API keys stored securely
- [ ] No sensitive data in logs

### Frontend
- [ ] CSP headers configured
- [ ] No API keys exposed in client bundle
- [ ] Input validation on all forms
- [ ] XSS protection enabled
- [ ] HTTPS enforced
- [ ] Wallet connection secure

### Infrastructure
- [ ] Firewall rules configured
- [ ] DDoS protection enabled
- [ ] Database backups enabled
- [ ] Secrets rotated regularly
- [ ] Access logs monitored

---

## Rollback Plan

### If Smart Contract Deployment Fails
1. Check deployment logs for errors
2. Verify deployer wallet has sufficient ETH
3. Check network congestion (gas prices)
4. Retry deployment with higher gas
5. If contract deployed but broken, deploy new instance

### If TEE Service Fails
1. Check container logs: `docker logs <container-id>`
2. Restart container: `docker restart <container-id>`
3. Roll back to previous Docker image
4. Check SGX attestation validity
5. Verify Cerebras API connectivity

### If Frontend Fails
1. Check Vercel deployment logs
2. Roll back to previous deployment: `vercel rollback`
3. Check environment variables
4. Verify API endpoints are accessible
5. Clear CDN cache

---

## Emergency Contacts

| Role | Contact | Method |
|------|---------|--------|
| DevOps Lead | [Name] | [Email/Phone] |
| Smart Contract Dev | [Name] | [Email/Phone] |
| Frontend Dev | [Name] | [Email/Phone] |
| Security Lead | [Name] | [Email/Phone] |

---

## Deployment History

| Date | Version | Deployer | Status | Notes |
|------|---------|----------|--------|-------|
| TBD | 1.0.0 | [Deployer] | ⏳ Pending | Initial production deployment |

---

## Post-Deployment Tasks

- [ ] Update documentation with deployment details
- [ ] Announce deployment on social media
- [ ] Update demo script with live URLs
- [ ] Monitor for 24 hours
- [ ] Collect user feedback
- [ ] Create GitHub release
- [ ] Update changelog
- [ ] Celebrate! 🎉

---

*Last Updated: 2026-02-28*
*Version: 1.0.0*
