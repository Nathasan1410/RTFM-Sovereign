# Troubleshooting Guide

## Overview

This guide provides comprehensive troubleshooting solutions for common issues encountered when developing, deploying, or using the RTFM-Sovereign platform.

---

## Table of Contents

1. [Setup & Installation](#setup--installation)
2. [Smart Contract Issues](#smart-contract-issues)
3. [TEE Service Issues](#tee-service-issues)
4. [Frontend Issues](#frontend-issues)
5. [Web3 & Wallet Issues](#web3--wallet-issues)
6. [AI Service Issues](#ai-service-issues)
7. [Deployment Issues](#deployment-issues)
8. [Performance Issues](#performance-issues)
9. [Security Issues](#security-issues)
10. [Testing Issues](#testing-issues)

---

## Setup & Installation

### Node.js Version Incompatible

**Symptom**: 
```
Error: Node.js version X.Y.Z is not supported
```

**Solutions**:

1. Install Node.js 18+:
```bash
# Using nvm (recommended)
nvm install 18
nvm use 18

# Using n
n 18

# Using apt (Linux)
sudo apt install nodejs npm
```

2. Verify installation:
```bash
node --version  # Should be >= 18.0.0
npm --version   # Should be >= 9.0.0
```

### pnpm Workspace Issues

**Symptom**:
```
Error: Cannot find module 'pnpm'
Error: Workspace not configured
```

**Solutions**:

1. Install pnpm:
```bash
npm install -g pnpm
```

2. Verify workspace configuration:
```bash
# Check if pnpm-workspace.yaml exists
cat pnpm-workspace.yaml

# Should contain:
# packages:
#   - 'apps/*'
#   - 'packages/*'
```

3. Clean install:
```bash
rm -rf node_modules
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules
pnpm install
```

### Dependency Installation Fails

**Symptom**:
```
Error: Cannot install package X
npm ERR! code ERESOLVE
```

**Solutions**:

1. Clear npm cache:
```bash
npm cache clean --force
```

2. Use legacy peer deps:
```bash
npm install --legacy-peer-deps
```

3. Check package.json conflicts:
```bash
npm ls package-name
```

4. Delete lock files and reinstall:
```bash
rm package-lock.json
rm pnpm-lock.yaml
pnpm install
```

### Environment Variables Not Loading

**Symptom**:
```
Error: undefined is not an object (evaluating 'process.env.VARIABLE')
```

**Solutions**:

1. Verify .env file exists:
```bash
ls -la .env .env.development .env.production
```

2. Check file permissions:
```bash
chmod 644 .env
```

3. Restart development server:
```bash
# Kill current process
Ctrl+C

# Restart
pnpm web:dev
```

4. Verify environment variable loading:
```bash
# In Next.js
console.log(process.env.NEXT_PUBLIC_TEE_URL)

# In Node.js
require('dotenv').config()
console.log(process.env.TEE_URL)
```

---

## Smart Contract Issues

### Contract Deployment Fails

**Symptom**:
```
Error: nonce too low
Error: insufficient funds for gas
```

**Solutions**:

1. Check wallet balance:
```bash
node scripts/check-balance.js
```

2. Get testnet ETH:
- [Alchemy Faucet](https://sepoliafaucet.com)
- [Infura Faucet](https://www.infura.io/faucet/sepolia)
- [PoW Faucet](https://sepolia-faucet.pk910.de/)

3. Increase gas price:
```bash
forge script script/DeployRegistry.s.sol \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --gas-price 20000000000  # 20 gwei
```

4. Reset nonce (advanced):
```bash
# Only use if you know what you're doing
cast send 0xYourAddress \
  --value 0 \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY
```

### Contract Verification Fails

**Symptom**:
```
Error: Contract verification failed
Error: Compiler version mismatch
```

**Solutions**:

1. Check Solidity version:
```bash
grep "pragma solidity" src/RTFMVerifiableRegistry.sol
```

2. Verify compiler settings match deployment:
```bash
forge verify-contract \
  0x7006e886e56426Fbb942B479AC8eF5C47a7531f1 \
  src/RTFMVerifiableRegistry.sol:RTFMVerifiableRegistry \
  --compiler-version 0.8.24 \
  --chain-id 11155111 \
  --watch
```

3. Verify constructor arguments:
```bash
# Check deployment transaction
cast tx <deployment_tx_hash> --rpc-url $RPC_URL
```

### Contract Call Fails with "InvalidState"

**Symptom**:
```
Error: InvalidState(uint8, uint8)
```

**Solutions**:

1. Check current stake state:
```typescript
const stake = await contract.getStakeDetails(user, topic);
console.log(`State: ${stake.state}`);
// States: 0=Idle, 1=Staked, 2=Attesting, 3=Released
```

2. Verify state transition is valid:
```typescript
// Example: Cannot stake if already staked
if (stake.state === 1) {
  console.error("Topic already staked");
  return;
}
```

3. Use emergency refund if stuck:
```typescript
const tx = await contract.emergencyRefund(topic);
await tx.wait();
```

### Contract Call Fails with "InvalidSignature"

**Symptom**:
```
Error: InvalidSignature()
```

**Solutions**:

1. Verify TEE public key:
```bash
cast call 0x7006e886e56426Fbb942B479AC8eF5C47a7531f1 \
  "TEE_PUBLIC_KEY()(address)" \
  --rpc-url $RPC_URL
```

2. Verify signature format:
```typescript
// Signature should be 65 bytes
const signature = "0x...";
console.log(signature.length); // Should be 132 (66 * 2)
```

3. Verify EIP-712 domain separator:
```typescript
const domainSeparator = await contract.getDomainSeparator();
console.log(domainSeparator);
```

4. Recreate signature if corrupted:
```typescript
// In TEE service
const signature = await teeIdentity.signAttestation({
  user: userAddress,
  topic: topic,
  score: score,
  nonce: nonce,
  deadline: deadline
});
```

---

## TEE Service Issues

### TEE Service Won't Start

**Symptom**:
```
Error: Port 3000 already in use
Error: Cannot bind to address
```

**Solutions**:

1. Find and kill process using port:
```bash
# Linux/Mac
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

2. Change port:
```bash
# In .env
PORT=3001
```

3. Check if service is already running:
```bash
curl http://localhost:3000/health
```

### TEE Identity Generation Fails

**Symptom**:
```
Error: Failed to generate TEE identity
Error: Key generation failed
```

**Solutions**:

1. Verify crypto libraries are installed:
```bash
npm list ethers
npm list @noble/secp256k1
```

2. Check entropy source:
```bash
# Linux
cat /dev/urandom | head -c 10 | od -An -tx1

# Windows
# System should provide entropy automatically
```

3. Clear key cache:
```bash
rm -rf apps/tee/.cache
rm -rf apps/tee/keys/*
```

4. Regenerate identity:
```typescript
import { TEEIdentity } from './crypto/signer';

const teeIdentity = new TEEIdentity();
const publicKey = teeIdentity.getPublicKey();
console.log("Generated public key:", publicKey);
```

### Challenge Generation Fails

**Symptom**:
```
Error: Challenge generation failed
Error: AI service unavailable
```

**Solutions**:

1. Check AI API key:
```bash
# Verify CEREBRAS_API_KEY is set
echo $CEREBRAS_API_KEY

# Test API key
curl -H "Authorization: Bearer $CEREBRAS_API_KEY" \
  https://api.cerebras.ai/v1/models
```

2. Check circuit breaker status:
```typescript
// In SwarmOrchestrator
const aiService = new SwarmOrchestrator();
const status = await aiService.getStatus();
console.log(status);
// Should show primary, fallback, or static mode
```

3. Manually trigger fallback:
```typescript
// Force static template mode
const challenge = await aiService.generateStaticChallenge(userAddress, topic);
```

4. Check AI provider logs:
```bash
# In TEE service logs
grep "AI" logs/tee.log
```

### Attestation Signing Fails

**Symptom**:
```
Error: Failed to sign attestation
Error: Invalid key material
```

**Solutions**:

1. Verify private key exists:
```bash
# Check key file
ls -la apps/tee/keys/private.key

# Should exist and be readable
cat apps/tee/keys/private.key | head -c 50
```

2. Verify key format:
```typescript
// Private key should be 64 hex characters (without 0x prefix)
const privateKey = "0x...";
console.log(privateKey.length); // Should be 66
```

3. Test signing:
```typescript
import { sign } from './crypto/sign';

const message = "test message";
const signature = await sign(message, privateKey);
console.log("Signature:", signature);
```

4. Check key permissions:
```bash
chmod 600 apps/tee/keys/private.key
```

### TEE Health Check Fails

**Symptom**:
```
Error: Service unhealthy
Error: Health check failed
```

**Solutions**:

1. Check service status:
```bash
curl http://localhost:3000/health
```

2. Verify all dependencies:
```bash
# Check AI service
curl https://api.cerebras.ai/v1/models

# Check blockchain RPC
curl -X POST https://sepolia.infura.io/v3/YOUR_KEY \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

3. Check service logs:
```bash
# Tail logs
tail -f logs/tee.log

# Search for errors
grep "ERROR" logs/tee.log
```

4. Restart service:
```bash
# Docker
docker-compose restart tee-service

# Node.js
pkill -f "node.*server"
node apps/tee/src/server.ts
```

---

## Frontend Issues

### Next.js Build Fails

**Symptom**:
```
Error: Build failed
Error: Module not found
```

**Solutions**:

1. Clear Next.js cache:
```bash
rm -rf .next
rm -rf apps/web/.next
pnpm web:build
```

2. Check for missing dependencies:
```bash
pnpm install
```

3. Verify imports:
```bash
# Check for circular dependencies
grep -r "import.*from.*@/" apps/web/src
```

4. Check TypeScript errors:
```bash
pnpm type-check
```

### Page Not Found (404)

**Symptom**:
```
404 Not Found
Error: Page could not be found
```

**Solutions**:

1. Verify file structure:
```bash
# Check app directory structure
ls -la apps/web/app/

# Should have:
# page.tsx
# layout.tsx
# learn/[sessionId]/page.tsx
# verify/[address]/page.tsx
```

2. Check for dynamic route parameters:
```typescript
// File: apps/web/app/learn/[sessionId]/page.tsx
export default function LearnPage({ params }: { params: { sessionId: string } }) {
  // ...
}
```

3. Restart dev server:
```bash
# Stop server
Ctrl+C

# Restart
pnpm web:dev
```

### Component Not Rendering

**Symptom**:
```
Component not visible
Error: Nothing renders
```

**Solutions**:

1. Check for console errors:
```bash
# In browser dev tools
# Open Console tab
# Look for red errors
```

2. Verify component export:
```typescript
// Correct
export default function MyComponent() { }

// Incorrect
export function MyComponent() { }
```

3. Check React rendering:
```typescript
// Add debug output
console.log("Component rendering");
```

4. Verify CSS visibility:
```css
/* Check for hidden or display: none */
.my-component {
  /* display: none; <- Remove this */
}
```

### Monaco Editor Crashes

**Symptom**:
```
White screen
Error: Monaco Editor crashed
```

**Solutions**:

1. Check ErrorBoundary is working:
```typescript
// Verify EditorErrorBoundary is wrapped around Monaco
<EditorErrorBoundary>
  <MonacoEditor />
</EditorErrorBoundary>
```

2. Check browser console for errors:
```javascript
// Look for Monaco-specific errors
// Common issues: CDN failure, worker failure
```

3. Verify Monaco initialization:
```typescript
// Check if editor is properly initialized
const editorRef = useRef<monaco.editor.IStandaloneCodeEditor>(null);

useEffect(() => {
  if (!editorRef.current) {
    // Initialize editor
  }
}, []);
```

4. Fallback to textarea if Monaco fails:
```typescript
{editorError ? (
  <textarea value={code} onChange={handleCodeChange} />
) : (
  <MonacoEditor />
)}
```

### State Not Persisting

**Symptom**:
```
State lost on refresh
Data not saving
```

**Solutions**:

1. Check Zustand persistence:
```typescript
import { persist } from 'zustand/middleware';

const useStore = create(
  persist(
    (set) => ({
      // state
    }),
    {
      name: 'rtfm-storage',
    }
  )
);
```

2. Check localStorage:
```javascript
// In browser console
localStorage.getItem('rtfm-storage')
```

3. Verify IndexedDB:
```javascript
// Open IndexedDB
const request = indexedDB.open('rtfm-db', 1);
```

4. Check for storage quota exceeded:
```javascript
// Check storage usage
navigator.storage.estimate().then(estimate => {
  console.log(`Used: ${estimate.usage}, Quota: ${estimate.quota}`);
});
```

---

## Web3 & Wallet Issues

### Wallet Connection Fails

**Symptom**:
```
Error: No wallet found
Error: Wallet not connected
```

**Solutions**:

1. Install MetaMask:
- Download from [metamask.io](https://metamask.io)

2. Check if wallet is installed:
```javascript
if (typeof window.ethereum !== 'undefined') {
  console.log('MetaMask installed');
} else {
  console.log('Please install MetaMask');
}
```

3. Request account access:
```typescript
const accounts = await window.ethereum.request({
  method: 'eth_requestAccounts'
});
```

4. Check network:
```typescript
const chainId = await window.ethereum.request({
  method: 'eth_chainId'
});
console.log('Chain ID:', chainId);
// Should be 0xaa36a7 (11155111) for Sepolia
```

### Wrong Network Error

**Symptom**:
```
Error: Wrong network
Error: Please switch to Sepolia
```

**Solutions**:

1. Switch to Sepolia:
```typescript
await window.ethereum.request({
  method: 'wallet_switchEthereumChain',
  params: [{ chainId: '0xaa36a7' }]
});
```

2. Add Sepolia if not configured:
```typescript
await window.ethereum.request({
  method: 'wallet_addEthereumChain',
  params: [{
    chainId: '0xaa36a7',
    chainName: 'Sepolia',
    rpcUrls: ['https://sepolia.infura.io/v3/YOUR_KEY'],
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }
  }]
});
```

3. Verify network in MetaMask:
- Open MetaMask
- Click network dropdown
- Select "Sepolia Test Network"

### Transaction Fails

**Symptom**:
```
Error: User rejected transaction
Error: Transaction failed
```

**Solutions**:

1. Check wallet balance:
```typescript
const balance = await provider.getBalance(address);
console.log('Balance:', ethers.formatEther(balance));
```

2. Check gas price:
```typescript
const feeData = await provider.getFeeData();
console.log('Gas price:', ethers.formatUnits(feeData.gasPrice, 'gwei'));
```

3. Estimate gas:
```typescript
const gasEstimate = await contract.estimateGas.stakeForChallenge(topic);
console.log('Gas estimate:', gasEstimate.toString());
```

4. Check transaction status:
```typescript
const tx = await contract.stakeForChallenge(topic, { value: stakeAmount });
await tx.wait(); // Wait for confirmation
console.log('Transaction confirmed:', tx.hash);
```

### Contract Not Found

**Symptom**:
```
Error: Contract not found
Error: Invalid contract address
```

**Solutions**:

1. Verify contract address:
```typescript
const CONTRACT_ADDRESS = '0x7006e886e56426Fbb942B479AC8eF5C47a7531f1';
console.log('Contract address:', CONTRACT_ADDRESS);
```

2. Check if contract exists:
```bash
cast code 0x7006e886e56426Fbb942B479AC8eF5C47a7531f1 \
  --rpc-url https://sepolia.infura.io/v3/YOUR_KEY
```

3. Verify network:
```typescript
const chainId = await walletClient.getChainId();
console.log('Chain ID:', chainId);
// Should be 11155111 for Sepolia
```

4. Check Etherscan:
- Visit: https://sepolia.etherscan.io/address/0x7006e886e56426Fbb942B479AC8eF5C47a7531f1

---

## AI Service Issues

### Cerebras API Fails

**Symptom**:
```
Error: Cerebras API request failed
Error: 401 Unauthorized
```

**Solutions**:

1. Verify API key:
```bash
echo $CEREBRAS_API_KEY
```

2. Get new API key:
- Visit: https://cloud.cerebras.ai/
- Generate new API key
- Update .env file

3. Test API:
```bash
curl -H "Authorization: Bearer $CEREBRAS_API_KEY" \
  https://api.cerebras.ai/v1/models
```

4. Check API status:
- Visit: https://status.cerebras.ai/

### AI Response Slow

**Symptom**:
```
AI response taking > 10 seconds
Challenge generation timeout
```

**Solutions**:

1. Check network latency:
```bash
ping api.cerebras.ai
```

2. Use fallback provider:
```typescript
// Circuit breaker will automatically switch to Groq
const orchestrator = new SwarmOrchestrator();
const response = await orchestrator.generateChallenge(...);
```

3. Reduce prompt complexity:
```typescript
// Shorter prompts are faster
const prompt = "Generate a simple challenge for " + topic;
```

4. Increase timeout:
```typescript
// In TEE service
const response = await fetch(url, {
  signal: AbortSignal.timeout(30000) // 30 seconds
});
```

### AI Returns Invalid JSON

**Symptom**:
```
Error: JSON.parse failed
Error: Invalid AI response
```

**Solutions**:

1. Validate AI response:
```typescript
try {
  const data = JSON.parse(response);
  // Validate data structure
  if (!data.modules || !Array.isArray(data.modules)) {
    throw new Error('Invalid response structure');
  }
} catch (error) {
  console.error('Failed to parse AI response:', error);
  // Use fallback
  return generateStaticChallenge(userAddress, topic);
}
```

2. Add response validation:
```typescript
import { z } from 'zod';

const ChallengeSchema = z.object({
  modules: z.array(z.object({
    id: z.string(),
    title: z.string(),
    weight: z.number(),
    questions: z.array(z.object({
      id: z.string(),
      question: z.string(),
      type: z.string(),
      points: z.number()
    }))
  }))
});

const validated = ChallengeSchema.parse(data);
```

3. Use static template as fallback:
```typescript
if (validationFailed) {
  return loadStaticTemplate(topic);
}
```

---

## Deployment Issues

### Vercel Deployment Fails

**Symptom**:
```
Error: Build failed
Error: Deployment error
```

**Solutions**:

1. Check environment variables:
- Go to Vercel dashboard
- Project Settings → Environment Variables
- Verify all required variables are set

2. Check build logs:
- Go to Vercel dashboard
- Deployments → Latest deployment
- View build logs

3. Test build locally:
```bash
pnpm web:build
```

4. Check node version:
```bash
# Vercel uses Node.js 18 by default
# Update if needed in vercel.json
{
  "buildCommand": "pnpm web:build",
  "nodeVersion": "18"
}
```

### Docker Build Fails

**Symptom**:
```
Error: Docker build failed
Error: Cannot build image
```

**Solutions**:

1. Check Dockerfile syntax:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

2. Clear Docker cache:
```bash
docker system prune -a
```

3. Build with no cache:
```bash
docker build --no-cache -t rtfm-tee:latest .
```

4. Check Docker daemon:
```bash
docker info
```

### TEE Deployment Fails

**Symptom**:
```
Error: EigenCompute deployment failed
Error: SGX not available
```

**Solutions**:

1. Verify SGX support:
```bash
# Check CPU supports SGX
lscpu | grep sgx
```

2. Check EigenCompute account:
- Verify account is active
- Check API keys
- Verify region availability

3. Use alternative deployment:
```bash
# Deploy to regular VM
docker run -d -p 3000:3000 rtfm-tee:latest
```

---

## Performance Issues

### Slow Page Load

**Symptom**:
```
Page takes > 5 seconds to load
```

**Solutions**:

1. Enable compression:
```javascript
// next.config.ts
module.exports = {
  compress: true
}
```

2. Optimize images:
```typescript
import Image from 'next/image';

<Image
  src="/logo.png"
  width={200}
  height={200}
  loading="lazy"
/>
```

3. Use code splitting:
```typescript
import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(() => import('./MonacoEditor'), {
  loading: () => <div>Loading...</div>
});
```

4. Enable caching:
```typescript
// Use React Query or SWR for data caching
import useSWR from 'swr';

const { data } = useSWR('/api/data', fetcher);
```

### High Memory Usage

**Symptom**:
```
Browser uses > 2GB memory
Tab crashes
```

**Solutions**:

1. Monitor memory usage:
```javascript
console.log('Memory:', performance.memory);
```

2. Clear unnecessary state:
```typescript
useEffect(() => {
  return () => {
    // Cleanup on unmount
    setState(null);
  };
}, []);
```

3. Use React.memo for expensive components:
```typescript
const ExpensiveComponent = React.memo(function ExpensiveComponent({ data }) {
  // ...
});
```

4. Implement pagination:
```typescript
// Instead of loading all data at once
const [page, setPage] = useState(1);
const { data } = useSWR(`/api/data?page=${page}`, fetcher);
```

---

## Security Issues

### Private Key Exposure

**Symptom**:
```
Private key in logs
Private key in git history
```

**Solutions**:

1. Check for leaked keys:
```bash
git log -p | grep -i "private.*key"
```

2. Rotate compromised keys:
```bash
# Generate new key
node scripts/generate-wallet.js

# Update environment variables
# Revoke old keys
```

3. Add to .gitignore:
```
# .gitignore
.env
.env.local
.env.production
keys/
*.key
```

4. Use secret management:
```bash
# Use AWS Secrets Manager, HashiCorp Vault, etc.
# Never commit secrets to git
```

### CORS Errors

**Symptom**:
```
Error: CORS policy blocked
Error: No 'Access-Control-Allow-Origin' header
```

**Solutions**:

1. Configure CORS in TEE service:
```typescript
import fastifyCors from '@fastify/cors';

await server.register(fastifyCors, {
  origin: true, // Allow all origins (development)
  credentials: true
});
```

2. Use proxy in production:
```typescript
// In next.config.ts
module.exports = {
  async rewrites() {
    return [
      {
        source: '/api/tee/:path*',
        destination: 'https://tee-service.com/:path*'
      }
    ];
  }
}
```

3. Verify CORS headers:
```bash
curl -H "Origin: http://localhost:3000" \
  -I http://localhost:3000/health
```

---

## Testing Issues

### Test Fails

**Symptom**:
```
Test failed
Error: Expected X but got Y
```

**Solutions**:

1. Run tests in verbose mode:
```bash
vitest --reporter=verbose
```

2. Run specific test:
```bash
vitest run test/filename.test.ts
```

3. Check test logs:
```typescript
console.log('Actual:', actual);
console.log('Expected:', expected);
```

4. Update test if expectations changed:
```typescript
// If implementation changed legitimately
expect(result).toBe(newValue);
```

### Contract Test Fails

**Symptom**:
```
Contract test failed
Error: Revert
```

**Solutions**:

1. Run with traces:
```bash
forge test -vvvv
```

2. Run specific test:
```bash
forge test --match-test testStakeFlow
```

3. Check gas usage:
```bash
forge test --gas-report
```

4. Debug with console.log:
```solidity
// In contract
console.log("Debug info:", value);
```

---

## Additional Resources

### Logs & Debugging

- **Frontend**: Browser DevTools Console
- **TEE Service**: `apps/tee/logs/tee.log`
- **Contracts**: Foundry test output
- **Build**: Vercel deployment logs

### Monitoring Tools

- **Frontend**: Vercel Analytics
- **TEE Service**: Custom health checks
- **Contracts**: Etherscan events
- **AI**: Cerebras dashboard

### Support Channels

- **Documentation**: docs/
- **GitHub Issues**: Create an issue
- **Discord**: #support channel
- **Email**: support@rtfm-sovereign.com

---

**Document Version**: 1.0  
**Last Updated**: 2026-02-23
