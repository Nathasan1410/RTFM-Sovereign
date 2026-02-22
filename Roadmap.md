**APP STATE & CHUNK MATRIX**  
*Ready for Chunk 1 Execution*

---

## 1. APP STATE TABLE: Current vs Target

| Component | Current State (MVP) | Target State (Sovereign v3.0) | Gap | Priority |
|-----------|-------------------|------------------------------|-----|----------|
| **Pedagogy** | Generic roadmap (baca docs → kuis) | Project-based micro-learning (build Card step-by-step) | **Massive** | P0 |
| **AI Agents** | Single AI generates roadmap | 3-tier: Architect → PM → Swarm (7x iterations) | **Massive** | P0 |
| **Code Verification** | None (text answers) | AST + Semantic AI Judge (rubric scoring) | **Large** | P0 |
| **Staking** | ❌ None | Progressive: 0.001 ETH/project, milestone unlocks | **Large** | P1 |
| **Smart Contract** | ❌ None deployed | Sepolia: Staking + Attestation + History | **Large** | P1 |
| **TEE Integration** | Basic service running | Agent Swarm coordination + IPFS storage | **Medium** | P1 |
| **Frontend** | Topic input + roadmap display | Monaco Editor + Step progression + Wallet | **Medium** | P1 |
| **HR Verification** | ❌ None | Verify page + Historical timeline + Code viewer | **Medium** | P2 |
| **Mock Mode** | ❌ None | Demo flags (fast-forward) | **Low** | P3 |

---

## 2. CHUNK IMPLEMENTATION TABLE (8 Chunks)

| # | Chunk Name | Brief Description | Key Deliverable | Est. Time | Depends On |
|---|-----------|------------------|----------------|-----------|------------|
| **1** | **Agent Architecture** | Prompt engineering for 3-tier system. Agent 1: Golden Path generator (research-based). Agent 2: Orchestrator with delegation logic. Agent 3: Swarm iteration protocol. JSON schemas for inter-agent communication. | Working multi-agent flow for "Card Component" (Agent 1 generates → Agent 2 delegates → Agent 3 executes 7 steps) | 8h | None |
| **2** | **AI Judging Engine** | Layer 1: AST parser (Babel) for syntax/structure validation. Layer 2: LLM semantic review with rubric (Functionality 40%, Quality 30%, Best Practice 20%, Innovation 10%). Feedback generator with specific hints (no solutions). | `/verify-code` endpoint accepting code, returning score (0-100) + detailed feedback + pass/fail status | 8h | Chunk 1 (needs Agent 2 output format) |
| **3** | **Smart Contracts** | `SkillStaking.sol`: Stake 0.001 ETH, milestone tracking, refund logic (85%/80%/60%/20%/0%). `SkillAttestation.sol`: Final attestation storage, IPFS hash logging, TEE whitelist. Deploy to Sepolia. | Deployed & verified contracts on Sepolia with milestone checkpoint functions | 6h | None (can parallel with Chunk 1) |
| **4** | **TEE Integration** | Agent 2 implementation (orchestration logic). Agent 3 instantiation (7x sequential execution). Session state management (Redis/memory). Contract interaction (signing txs). IPFS pinning integration. | TEE service handling Agent 2 → Agent 3 delegation, returning compiled milestone results | 8h | Chunk 1, 3 |
| **5** | **Frontend Core** | Monaco Editor integration (syntax highlighting). Step progression UI (Step 1/5 indicators, lock/unlock). Milestone navigation (previous/next). Code submission interface. | Interactive coding interface with step-by-step progression, connected to AI Judge (Chunk 2) | 8h | Chunk 2 |
| **6** | **Wallet & Staking UI** | RainbowKit connection. Stake modal (0.001 ETH confirmation). Transaction status tracking (pending/success/fail). Refund claim interface. Balance display. | Full web3 flow: Connect → Stake → Progress → Claim Refund | 6h | Chunk 3, 5 |
| **7** | **HR Verify Portal** | `/verify` page with address lookup. Historical timeline (milestones with timestamps). Code viewer (fetch from IPFS). PDF certificate generator. Authenticity verification (signature check). | Public verification interface for employers to check credentials + history | 6h | Chunk 4, 6 |
| **8** | **Demo & Mock Mode** | Demo flags: Fast-forward AI judging (instant), auto-fill correct answers, skip staking for dev. Integration testing (end-to-end). Fallback handling (AI down → template). | Working demo for Feb 27 with quick-mode for presentation | 4h | All above |

**Total Estimate:** 54 hours  
**Parallel Opportunities:** Chunk 3 (Contracts) can run parallel with Chunks 1-2  
**Solo Dev Strategy:** Chunk 1→2→4 (Agent system) parallel with Chunk 3 (Contracts), then 5→6→7→8

---

## 3. OPTIMIZATION NOTES

### Regarding 7 Iterations (Agent 3 Swarm)
**Concern:** 7 LLM calls × 3-10s = 21-70s per milestone, UX too slow  
**Optimization for Chunk 1:**
- **Parallel Execution:** Agent 3 instances run concurrently (not sequentially) where possible
- **Early Exit:** If step N fails validation, stop swarm (don't waste calls on 4-7)
- **Streaming:** Show progress "Generating step 3/7..." to user while waiting
- **Lite Mode Default:** Use 3 iterations for demo, 7 only for "Deep Mode" toggle

**Recommendation:** Implement **adaptive iteration** (3-7 based on complexity) in Chunk 1 spec

### Golden Path Generation (Agent 1)
**Confirmed:** Not hardcoded, prompt-engineered  
**Key Prompt Strategy for Agent 1:**
```
"You are a Curriculum Architect. User wants to learn: [TOPIC]
Create a project-based roadmap that BUILDs something tangible.
Rules:
- 5-7 milestones, each producing runnable code
- No theory-only steps, every step must add to the project
- Final output must be deployable/showable
- Mark complex milestones as 'deep_mode: true' (needs swarm)
- Include specific file structure (which files to create)"
```

---

## ✅ READY FOR CHUNK 1 EXECUTION

**Pre-conditions Met:**
- [x] Architecture confirmed (3-tier agent)
- [x] Optimization strategy set (adaptive 3-7 iterations)
- [x] Golden path approach clear (AI-generated, not hardcoded)
- [x] Mock mode deferred (end of project)
- [x] 8 chunks defined with dependencies mapped

**Next Action:**  
Proceed to **Chunk 1: Agent Architecture & Communication Protocol** (8h)

**Critical Success Criteria for Chunk 1:**
1. Agent 1 can generate "Card Component" golden path with 5 milestones, marked which are deep_mode
2. Agent 2 can receive golden path and delegate deep_mode milestones to Agent 3
3. Agent 3 can execute 3-7 micro-steps sequentially, each returning code + explanation
4. JSON schemas defined for all inter-agent communication

**Execute Chunk 1 now?** (Y/N + any final adjustments to tables above)