# Technical Debt

This document tracks technical debt, shortcuts, and known limitations accumulated during the development of RTFM-Sovereign for the EigenCloud OIC 2026 hackathon.

## Priority Levels
- 🔴 **Critical**: Must be resolved before production deployment
- 🟡 **High**: Should be resolved before final demo
- 🟢 **Medium**: Can be deferred if time-constrained
- 🟢 **Low**: Nice-to-have improvements

---

## Chunk 11: Cryptographic Signing & Attestation

### 🔴 CRITICAL: Mock Expected Answers in `/attest` Endpoint
**Location**: `apps/tee/src/server.ts` (line ~70)
**Issue**: The `/attest` endpoint uses hardcoded mock keywords for grading:
```typescript
const expectedAnswers: ExpectedAnswer[] = [
  { keywords: ['concept', 'blockchain', 'decentralized'], weight: 30 },
  { keywords: ['security', 'vulnerability', 'check'], weight: 30 },
  { keywords: ['optimization', 'gas', 'memory'], weight: 20 },
  { keywords: ['testing', 'unit', 'integration'], weight: 20 }
];
```

**Root Cause**: ArchitectAgent doesn't expose expected keywords in its public interface. The endpoint regenerates the challenge to infer keywords, which is inefficient and could cause mismatch if challenge generation logic changes.

**Impact**: 
- Users may receive unfair grading if their actual challenge had different keywords
- Grading is not truly verifiable against the original challenge
- Hardcoded values don't scale with different topics or difficulties

**Solution Options**:
1. Add `getExpectedKeywords(topic: string): string[]` method to `ArchitectAgent`
2. Store generated challenges in memory/cache with their expected answers
3. Refactor to pass `Challenge` object directly to `/attest` endpoint

**Estimated Effort**: 1-2 hours

---

### 🟡 HIGH: Local Nonce Management Without Persistence
**Location**: `apps/tee/src/crypto/sign.ts`
**Issue**: Nonces are stored in an in-memory `Map<string, bigint>`:
```typescript
private nonceMap = new Map<string, bigint>();
```

**Root Cause**: Quick MVP implementation without considering TEE restarts or multi-instance scenarios.

**Impact**:
- If TEE container restarts, all nonce state is lost
- Multiple TEE instances (for scaling) will have independent nonce states
- Contract may reject transactions with nonce conflicts

**Solution**:
1. Store nonces in `/sealed/nonce-state.json` (persisted with SGX sealing)
2. Or query current nonce from contract before generating attestation
3. Implement nonce recovery logic on startup

**Estimated Effort**: 2-3 hours

---

### 🟡 HIGH: No Persistent Challenge Storage
**Location**: `apps/tee/src/agents/ArchitectAgent.ts`
**Issue**: Challenges are generated on-demand deterministically but not stored or tracked.

**Root Cause**: Stateless design for MVP simplicity.

**Impact**:
- Users cannot retrieve their original challenge if they lose the response
- No audit trail of which challenges were issued to which users
- Cannot verify if a challenge was tampered with after issuance
- Difficult to debug grading disputes

**Solution**:
1. Implement `ChallengeStore` interface with in-memory or persisted storage
2. Store issued challenges with timestamps and user addresses
3. Add `/challenge/:challengeId` GET endpoint for retrieval
4. Add TTL/expiration logic for old challenges

**Estimated Effort**: 2-4 hours

---

### 🟡 HIGH: Generic Error Messages
**Location**: `apps/tee/src/server.ts`
**Issue**: Several endpoints return generic error responses:
```typescript
res.status(500).json({ error: 'Internal Server Error' });
```

**Root Cause**: Error handling added quickly without considering user experience.

**Impact**:
- Difficult to debug issues in production
- Poor user experience during errors
- Security logs may expose sensitive information if not careful

**Solution**:
1. Define specific error types (ValidationError, GradingError, SigningError)
2. Return structured error responses with codes and messages
3. Log detailed errors server-side, return user-friendly messages

**Estimated Effort**: 1-2 hours

---

### 🟡 HIGH: No Retry Logic for `/attest` Endpoint
**Location**: `apps/tee/src/server.ts` (POST `/attest`)
**Issue**: The critical attestation endpoint doesn't implement retry logic for transient failures.

**Root Cause**: Oversight during integration - other endpoints have retry but `/attest` doesn't.

**Impact**:
- Temporary network issues cause attestation failures
- Users must manually retry, potentially staking multiple times
- Poor reliability for the core value proposition

**Solution**:
1. Add retry decorator/wrapper for `signAttestation` calls
2. Use exponential backoff with circuit breaker
3. Return retryable vs non-retryable error classification

**Estimated Effort**: 1 hour

---

### 🟢 MEDIUM: Circuit Breaker State Not Persisted
**Location**: `apps/tee/src/services/CerebrasService.ts`
**Issue**: Circuit breaker state (`isOpen`, `failureCount`, `successCount`) is in-memory only.

**Root Cause**: Simple implementation without considering persistence needs.

**Impact**:
- If TEE restarts, circuit breaker resets to closed state
- No historical data on Cerebras API reliability
- Cannot tune circuit breaker thresholds based on real metrics

**Solution**:
1. Store circuit breaker state in `/sealed/circuit-breaker-state.json`
2. Add metrics collection (failure rate, success rate)
3. Implement state recovery on startup

**Estimated Effort**: 2-3 hours

---

### 🟢 MEDIUM: Placeholder Contract Address
**Location**: `apps/tee/src/crypto/sign.ts`
**Issue**: Using placeholder address for EIP-712 domain separator:
```typescript
verifyingContract: process.env.CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000'
```

**Root Cause**: Contracts not yet deployed to Sepolia (Chunk 5 blocked by wallet funding).

**Impact**:
- Signatures generated now will fail verification after contract deployment
- Must redeploy or update environment variable after deployment
- Testing against mock vs real contract creates mismatch

**Solution**:
1. Deploy contracts to Sepolia (fund wallet first)
2. Update `CONTRACT_ADDRESS` environment variable
3. Add configuration validation on startup (reject invalid addresses)

**Estimated Effort**: Blocked by external dependency (wallet funding)

---

### 🟢 MEDIUM: Limited Health Check Readiness
**Location**: `apps/tee/src/server.ts` (GET `/health/ready`)
**Issue**: Readiness check only validates local services:
```typescript
const ready = {
  ready: true,
  checks: {
    signer: signer.isReady(),
    memory: process.memoryUsage().heapUsed < 500 * 1024 * 1024
  }
};
```

**Root Cause**: Doesn't verify connectivity to blockchain, contract address validity, or external dependencies.

**Impact**:
- Service may report ready but unable to process transactions
- No detection of configuration issues until runtime
- Poor observability for deployment troubleshooting

**Solution**:
1. Add contract connection check (RPC provider connectivity)
2. Verify `CONTRACT_ADDRESS` is valid (not zero address)
3. Check Cerebras API key configuration
4. Add optional dependencies checks (database, cache)

**Estimated Effort**: 1-2 hours

---

## Chunk 10: Swarm Orchestration

### 🟢 MEDIUM: No Request Rate Limiting
**Location**: `apps/tee/src/orchestrator/SwarmOrchestrator.ts`
**Issue**: No rate limiting on concurrent operations.

**Root Cause**: Focus on concurrency control without considering API limits.

**Impact**:
- Excessive concurrent requests could hit Cerebras API limits
- Resource exhaustion under load
- Potential for account throttling or IP bans

**Solution**:
1. Add rate limiter with token bucket algorithm
2. Per-user and global limits
3. Return 429 (Too Many Requests) appropriately

**Estimated Effort**: 2-3 hours

---

## Chunk 9: AI Agents & Services

### 🟢 LOW: No Telemetry/Metrics Collection
**Location**: All agents and services
**Issue**: Limited observability of AI service performance.

**Root Cause**: Pino logging added but no metrics aggregation.

**Impact**:
- Difficult to optimize performance
- No historical data on grading accuracy
- Cannot detect drift in AI model behavior

**Solution**:
1. Add Prometheus metrics endpoints
2. Track grading score distributions
3. Monitor Cerebras API latency and success rates

**Estimated Effort**: 3-4 hours

---

## Chunk 8: Containerization

### 🟢 LOW: No Health Check Metrics Endpoint
**Location**: `apps/tee/src/server.ts`
**Issue**: No dedicated `/metrics` endpoint for monitoring.

**Root Cause**: Health checks exist but no metrics aggregation.

**Impact**:
- Cannot integrate with monitoring systems (Prometheus, Grafana)
- Manual SSH required for debugging performance issues
- No historical performance data

**Solution**:
1. Add `GET /metrics` endpoint returning Prometheus-formatted metrics
2. Include request counts, error rates, response times
3. Add service version and build information

**Estimated Effort**: 2 hours

---

## Summary

### Total Estimated Effort to Resolve Debt:
| Priority | Count | Total Effort |
|-----------|--------|---------------|
| Critical  | 1      | 1-2 hours    |
| High      | 5      | 8-13 hours   |
| Medium     | 3      | 7-9 hours    |
| Low        | 2      | 5-7 hours    |
| **Total**   | **11**  | **21-31 hours** |

### Quick Wins (Can be done in < 1 hour each):
1. ✅ Improve `/attest` error messages
2. ✅ Add `/health/ready` contract connection check
3. ✅ Add retry logic to `/attest` endpoint
4. ✅ Add `/metrics` endpoint for monitoring

### Blocked Items (Requires External Action):
1. 🔴 Deploy smart contracts to Sepolia (fund wallet)
2. 🔴 Update `CONTRACT_ADDRESS` environment variable

### Recommended Next Steps:
1. **For Hackathon Demo**: Resolve Quick Wins (items 1-4 above)
2. **For Production**: Resolve Critical + High debt items before mainnet deployment
3. **For Scalability**: Implement persistence (nonce, challenges, circuit breaker state)

---

*Last Updated: 2026-02-22 (After Chunk 11 implementation)*
