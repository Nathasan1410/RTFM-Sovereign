# Project Manager Discussion: RTFM-Sovereign Status & Direction

## Current Status Summary

### What's Built (MVP)
- ✅ Roadmap Generation (TEE + Eigen AI)
- ✅ GradingService (basic, not signed/cryptographic)
- ✅ TEE Service running locally
- ✅ Frontend UI (topic input, roadmap display)

### What's Missing (Sovereign Vision)
- ❌ Smart Contract Deployment
- ❌ Staking Mechanism
- ❌ On-chain Attestation
- ❌ Wallet Connection for Users
- ❌ Project-based Micro-Learning Pedagogy

---

## Key Discussion Points with Project Manager

### 1. Core Value Proposition Triage

**Question**: Should we prioritize:
- **A) Technical Sovereignty** (Smart contracts, staking, blockchain proof) - High risk, low pedagogy value
- **B) Pedagogical Innovation** (Project-based micro-learning, step-by-step code verification) - Working product, high demo value
- **C) Hybrid Approach** (Progressive Staking) - Best of both, medium complexity

**Recommendation**: **Option C - Progressive Staking**

**Rationale**:
- Learning innovation is the differentiator (vs Coursera/Udemy)
- Staking adds "skin in the game" without blocking exploration
- Demo narrative becomes: "Teach by building → Verify with sovereign proof"

---

### 2. "Progressive Staking" Architecture Feasibility

**Proposed Flow**:
1. **Explore (Free)**: User requests "Build Card Component" → AI generates 5-step roadmap (preview)
2. **Commit (Stake)**: User accepts roadmap → Stake 0.001 ETH → Step 1 unlocks
3. **Execute (Learn)**: User submits Step 1 code → AI verifies → Step 2 unlocks → ... → Step 5
4. **Attest (Final)**: All steps complete → TEE generates score → On-chain → Refund

**Questions for PM**:
1. **On-chain vs Off-chain Step Tracking**: Should each step be recorded on-chain (expensive) or only final attestation?
2. **Abandonment Handling**: What happens if user stakes, completes 2/5 steps, then quits?
3. **Gas Optimization**: Is calling `completeStep()` for each of 5 steps acceptable (~$0.50)?

**Recommendation**:
- **Off-chain step tracking** (TEE session state)
- **On-chain final attestation only** (to minimize gas)
- **Refund logic**: Based on completion percentage (2/5 = 40% refund, 5/5 = 80%)

---

### 3. Pedagogical Gap - "Golden Paths" vs AI Generation

**Current State**: AI generates generic roadmaps (read docs, write code)
**Gemini Spec**: Requires specific, project-based curricula with step-by-step solutions

**Question**: Should we:
- **A)** Hardcode 3 "Golden Path" projects (Card, Todo, API Fetch) with perfect steps
- **B)** Let AI generate steps dynamically (risk: hallucination, inconsistent quality)
- **C)** Hybrid (Golden Paths for demo, AI for custom requests)

**Recommendation**: **Option C - Hybrid**

- **Demo Quality**: Golden paths guarantee working examples for judges
- **Scalability**: AI handles custom requests ("Build a Dashboard", not just predefined)
- **Fallback Warning**: "Custom projects may have quality variance - proceed?"

---

### 4. Code Verification Strategy

**Critical Decision**: How does AI judge correctness without executing code?

| Option | Pros | Cons |
|--------|--------|--------|
| **Exact Match** | Simple, deterministic | Too strict - coding style varies |
| **AST Parsing** | Language-agnostic | Too complex for 4 days |
| **Functional Testing** | Real execution | Security risk (untrusted code) |
| **Semantic Review** | Flexible, LLM-native | May miss edge cases |

**Recommendation**: **Semantic Review + Required Element Checklist**

- **Semantic**: LLM reads code, understands intent
- **Checklist**: Hard constraints (e.g., "Must use flexbox", "Must have onClick handler")
- **Give Up Handler**: Reveal solution code, mark as "Assisted" (lower score), continue flow

---

### 5. Timeline & Resource Reality Check

**Time Remaining**: 4.5 days until Feb 27

**Chunked Plan** (8 chunks × 20K chars = ~4 days):

| Chunk | Scope | Est. Time |
|--------|--------|-----------|
| 1: Pedagogical Architecture & AI Persona | System Prompt v2.0, Roadmap logic | 6h |
| 2: Step Verification Engine | Code analysis, feedback generator | 6h |
| 3: Golden Path Curriculum | 3 complete project blueprints | 8h |
| 4: Progressive Staking Contract | Modified contract with step tracking | 4h |
| 5: TEE Integration - Step State | Session management, verification endpoints | 4h |
| 6: Frontend - Step UI & Progression | Step indicator, code editor, lock/unlock | 6h |
| 7: Wallet Integration & Staking Flow | RainbowKit, stake modal, claim refund | 4h |
| 8: Mock Mode & Demo Orchestration | Demo flags, integration tests | 4h |

**Total**: ~42 hours = 5.25 days

**Question for PM**: 
- Is 5.25 days acceptable given 4.5 day deadline?
- Should we drop to 6 chunks (drop Mock Mode or reduce Golden Paths to 2)?

---

### 6. Risk Assessment

| Risk | Impact | Mitigation |
|--------|----------|-------------|
| **TEE Approval Pending** | Cannot deploy production | Mock TEE signing for demo |
| **Smart Contract Complexity** | May not finish in time | Simplify to basic staking, add step tracking later |
| **AI Quality Variance** | Golden paths perfect, AI paths inconsistent | Warn users on custom projects |
| **Integration Hell** | 8 chunks → complex wiring | Incremental integration (test after each chunk) |

---

## Critical Decision Points for PM

### Decision 1: Architecture Direction
**A)** Pedagogy First (Recommended) - Build working AI tutor, mock staking for demo
**B)** Sovereignty First - Deploy contracts, keep generic pedagogy
**C)** Parallel - Split developers (if available)

### Decision 2: Step Tracking Strategy
**A)** On-chain (each step transaction) - Expensive but truly sovereign
**B)** Off-chain (TEE session state) - Cheaper, faster, single final tx
**C)** Hybrid (milestone checkpoints) - Every 3rd step on-chain

### Decision 3: Content Strategy
**A)** Hardcode Golden Paths - Perfect demos, limited scope
**B)** AI Generation Only - Unlimited scope, quality variance
**C)** Hybrid - 3 Golden Paths + AI fallback

---

## Action Request

**Please confirm**:
1. Architecture direction (A/B/C from Decision 1)
2. Step tracking strategy (A/B/C from Decision 2)
3. Content strategy (A/B/C from Decision 3)
4. Timeline acceptability (5.25 days for 8 chunks?)

Once confirmed, I will execute the agreed approach.
