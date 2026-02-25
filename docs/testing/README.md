# 🧪 Testing Guide

Complete testing documentation for RTFM project.

## 📁 Test Organization

### Web App Tests
**Location:** [`apps/web/__tests__/`](../../apps/web/__tests__)

```
apps/web/__tests__/
├── components/              # Component tests
│   ├── staking-modal.test.tsx
│   └── ...
├── hooks/                   # Custom hook tests
│   ├── useStake.test.ts
│   ├── useSession.test.ts
│   └── ...
├── integration/             # Integration tests
│   └── staking-features.test.ts
└── e2e/                     # E2E tests (Playwright)
    └── ...
```

**Run Tests:**
```bash
cd apps/web

# All tests
npm run test

# Unit tests (Vitest)
npm run test:unit

# E2E tests (Playwright)
npm run test:e2e

# With coverage
npm run test:coverage
```

---

### TEE Backend Tests
**Location:** [`apps/tee/src/__tests__/`](../../apps/tee/src/__tests__)

```
apps/tee/src/__tests__/
├── contracts/               # Contract interaction tests
│   ├── AttestationSubmission.test.ts
│   └── MilestoneRecording.test.ts
├── services/                # Service tests
│   ├── TEESigner.test.ts
│   ├── GradingService.test.ts
│   └── ipfs.test.ts
├── integration/             # Integration tests
│   ├── happy-path.test.ts
│   ├── sgx-attestation.test.ts
│   └── ...
├── e2e/                     # E2E tests
│   └── checkpoint-e2e.test.ts
└── crypto/                  # Cryptography tests
    ├── TEEIdentity.test.ts
    └── SigningService.test.ts
```

**Run Tests:**
```bash
cd apps/tee

# All tests
npm run test

# Unit tests
npm run test:unit

# Integration tests
npm run test:integration
```

---

### Contract Tests
**Location:** [`packages/contracts/test/`](../../packages/contracts/test/)

```
packages/contracts/test/
├── SkillStaking.t.sol       # Foundry tests for staking
├── SkillAttestation.t.sol   # Foundry tests for attestation
├── SkillStaking.test.ts     # JavaScript tests
└── SkillAttestation.test.ts # JavaScript tests
```

**Run Tests:**
```bash
cd packages/contracts

# Foundry tests
forge test

# JavaScript tests
npm run test

# Gas reports
forge test --gas-report
```

---

## 📊 Test Coverage

### Current Coverage

| Package | Tests | Passing | Failing | Skipped |
|---------|-------|---------|---------|---------|
| **Web App** | 17 | 14 | 3* | 3 |
| **TEE Backend** | 15 | 12 | 0 | 3 |
| **Contracts** | 100+ | 100+ | 0 | 0 |

*Failing tests are pre-existing type issues (non-blocking)

### Key Test Files

#### Web App (New - Staking Features)
- ✅ `staking-modal.test.tsx` - Staking modal component
- ✅ `staking-features.test.ts` - Integration tests (14 passing)
- ✅ `useStake.test.ts` - Stake hook

#### TEE Backend
- ✅ `happy-path.test.ts` - Complete flow
- ✅ `sgx-attestation.test.ts` - TEE verification
- ✅ `checkpoint.test.ts` - On-chain checkpoints

#### Contracts
- ✅ `SkillStaking.t.sol` - Staking contract (Foundry)
- ✅ `SkillAttestation.t.sol` - Attestation contract (Foundry)

---

## 🚀 Writing Tests

### Best Practices

1. **Name tests clearly**
   ```typescript
   // ✅ Good
   it('should call claimRefund with correct arguments', async () => {})
   
   // ❌ Bad
   it('works', () => {})
   ```

2. **Test one thing per test**
   ```typescript
   // ✅ Good
   it('should stake ETH', async () => {})
   it('should detect existing stake', async () => {})
   
   // ❌ Bad
   it('should stake and detect and refund', () => {})
   ```

3. **Use describe blocks**
   ```typescript
   describe('StakingModal', () => {
     describe('Mode Selection', () => {})
     describe('Proof Mode', () => {})
     describe('Error Handling', () => {})
   })
   ```

4. **Mock external dependencies**
   ```typescript
   vi.mock('wagmi', async () => {
     const actual = await vi.importActual('wagmi')
     return {
       ...actual,
       useWriteContract: () => ({
         writeContractAsync: vi.fn()
       })
     }
   })
   ```

---

## 📋 Test Checklist

### Before Submitting PR

- [ ] All new features have tests
- [ ] Existing tests pass
- [ ] No new test failures
- [ ] Coverage maintained or improved
- [ ] E2E tests updated if UI changed

### Running All Tests

```bash
# From root
npm run test

# Or individually
cd apps/web && npm run test
cd apps/tee && npm run test
cd packages/contracts && forge test
```

---

## 🔗 Related Documentation

- [Architecture](../technical/ARCHITECTURE.md)
- [API Reference](../technical/API.md)
- [Contributing Guide](../CONTRIBUTING.md)

---

**Last Updated:** 2026-02-25  
**Maintained By:** Development Team
