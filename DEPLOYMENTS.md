# RTFM-Sovereign Deployment Log

## Network: Sepolia Testnet (Chain ID: 11155111)
## Date: TBD
## Deployer: 0x4DF66E441dEC0FcbFCd1464618f8D44eb2cAb0ad

> **NOTE**: Deployment pending wallet funding. Current balance: 0 ETH

### Contract Addresses

| Contract | Address | Status | Etherscan |
|----------|---------|--------|-----------|
| RTFMVerifiableRegistry | TBD | ⏳ Pending | [Link](...) |
| RTFMFaucet | TBD | ⏳ Pending | [Link](...) |

### Constructor Arguments

#### RTFMVerifiableRegistry
- **deployer**: Set automatically to msg.sender (deployer address)
- **domainName**: "RTFMVerifiableRegistry"
- **domainVersion**: "1"

#### RTFMFaucet
- **DRIP_AMOUNT**: 0.01 ether
- **COOLDOWN_PERIOD**: 1 hours

### Setup Transactions

> **Pending deployment - awaiting wallet funding**

1. Enroll TEE: TBD (Tx Hash: TBD)
2. Activate TEE: TBD (Tx Hash: TBD)
3. Renounce Ownership: TBD (Tx Hash: TBD)

### Current State

- **Owner**: Deployer (will be burned after TEE activation)
- **TEE**: TBD (will be set during enrollment)
- **Treasury Balance**: 0 ETH
- **Total Stakes**: 0

### Deployment Checklist

- [ ] Wallet funded (≥ 0.3 ETH)
- [ ] RTFMVerifiableRegistry deployed
- [ ] RTFMFaucet deployed
- [ ] TEE enrolled and activated
- [ ] Ownership renounced (deployer → 0x0)
- [ ] Contracts verified on Etherscan
- [ ] Faucet funded (≥ 0.05 ETH)
- [ ] ABIs exported to frontend
- [ ] Environment variables updated
- [ ] Smoke tests completed

### Pre-Deployment Commands

```bash
# 1. Check wallet balance
node scripts/check-balance.js

# 2. Deploy Registry
forge script script/Deploy.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $DEPLOYER_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY

# 3. Deploy Faucet
forge create RTFMFaucet \
  --constructor-args "" \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $DEPLOYER_KEY \
  --broadcast \
  --verify

# 4. Fund Faucet
cast send 0.05ether \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $DEPLOYER_KEY \
  $FAUCET_ADDRESS
```

### Post-Deployment Commands

```bash
# 1. Enroll TEE
cast send $TEE_PUBLIC_KEY \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $DEPLOYER_KEY \
  $REGISTRY_ADDRESS \
  --data "0x..."  # enrollTEE(address,bytes) calldata

# 2. Activate TEE (from TEE wallet)
cast send "" \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $TEE_PRIVATE_KEY \
  $REGISTRY_ADDRESS \
  --data "0x..."  # activateTEE() calldata

# 3. Verify TEE is active
cast call $REGISTRY_ADDRESS \
  "TEE_PUBLIC_KEY()" \
  --rpc-url $SEPOLIA_RPC_URL

# 4. Renounce Ownership (from deployer)
cast send "" \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $DEPLOYER_KEY \
  $REGISTRY_ADDRESS \
  --data "0x..."  # renounceOwnership() calldata
```

### Verification Commands

```bash
# Check contract is verified
curl -X GET "https://api-sepolia.etherscan.io/api?module=contract&action=getabi&address=$REGISTRY_ADDRESS"

# Verify TEE enrollment
cast call $REGISTRY_ADDRESS \
  "TEE_PUBLIC_KEY()" \
  --rpc-url $SEPOLIA_RPC_URL

# Verify ownership burned
cast call $REGISTRY_ADDRESS \
  "owner()" \
  --rpc-url $SEPOLIA_RPC_URL
# Should return: 0x0000000000000000000000000000000000000000000000
```

### Environment Variables for Frontend

Update `apps/web/.env.local` after deployment:

```bash
# Contract Addresses
NEXT_PUBLIC_REGISTRY_CONTRACT=0x...  # Update after deployment
NEXT_PUBLIC_FAUCET_CONTRACT=0x...     # Update after deployment
NEXT_PUBLIC_CHAIN_ID=11155111

# TEE Endpoint
NEXT_PUBLIC_TEE_URL=https://tee-instance.eigencloud.xyz

# RPC URLs
NEXT_PUBLIC_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
```

### ABI Export

Export ABIs to frontend:

```bash
# Copy Registry ABI
cp out/RTFMVerifiableRegistry.sol/RTFMVerifiableRegistry.json \
   apps/web/src/contracts/

# Copy Faucet ABI
cp out/RTFMFaucet.sol/RTFMFaucet.json \
   apps/web/src/contracts/
```

### Troubleshooting

#### Deployment Fails

**Error**: "Intrinsic gas too low"
- **Fix**: Increase gas limit in Foundry config

**Error**: "Transaction underpriced"
- **Fix**: Wait for gas prices to drop, or increase gas price

**Error**: "Nonce too low"
- **Fix**: Deploy from fresh account or reset nonce in RPC

#### Verification Fails

**Error**: "Contract verification failed"
- **Fix**:
  1. Check Etherscan API key is correct
  2. Verify source code is flattened correctly
  3. Retry with `--verify` flag again

#### TEE Enrollment Fails

**Error**: "Unauthorized" when calling activateTEE
- **Fix**: Ensure you're calling from the enrolled TEE address, not deployer address

---

## Deployment Notes

### Gas Costs (Estimated)

| Operation | Gas Used | Cost (Sepolia @ 10 gwei) |
|-----------|----------|-------------------------------|
| Deploy Registry | ~2.5M | ~0.025 ETH |
| Deploy Faucet | ~1.5M | ~0.015 ETH |
| Enroll TEE | ~50k | ~0.0005 ETH |
| Activate TEE | ~30k | ~0.0003 ETH |
| Stake | ~65k | ~0.00065 ETH |
| Submit Attestation | ~120k | ~0.0012 ETH |

**Total Estimated Deployment Cost**: ~0.042 ETH

### Timeline

- **Chunk 5 Deployment**: Day 3 of hackathon
- **TEE Integration**: Days 4-5 (Chunks 6-7)
- **Frontend Integration**: Days 5-6 (Chunks 13-16)
- **Final Testing**: Day 6 (Chunk 19)

---

## Links

- **Etherscan Sepolia**: https://sepolia.etherscan.io
- **Registry Contract**: TBD
- **Faucet Contract**: TBD
- **Deployer Wallet**: https://sepolia.etherscan.io/address/0x4DF66E441dEC0FcbFCd1464618f8D44eb2cAb0ad

---

*Last Updated: 2026-02-22 - Pending Deployment*
