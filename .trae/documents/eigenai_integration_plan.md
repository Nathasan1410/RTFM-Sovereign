# Plan: Make App Fully Compatible with Eigen AI deTERMinal Token Grants

## Current Status
- ✅ EigenAIProvider implements wallet signature authentication
- ✅ Wallet `0xacb57DB3B76706fc8942137EAEB62eF90BAD47a3` has 999,760 tokens (valid grant)
- ✅ Eigen AI is set as primary provider in LLMService
- ✅ Local testing confirms Eigen AI works

## Required Changes

### 1. Update Production Environment Variables (.env.production)
**Issue**: .env.production has old `EIGENAI_API_KEY` instead of `WALLET_PRIVATE_KEY`

**Action**: Update .env.production with wallet credentials
```bash
# Remove old API key
# EIGENAI_API_KEY=ilovenasigoreng  # Remove this

# Add wallet private key for deTERMinal token grants
WALLET_PRIVATE_KEY=0x14f2045df205ff5ea676c1b8d0c1af01d193b455ea0201658fbf1ca5fc0eb2a0
```

### 2. Verify Provider Priority in LLMService
**Current state**: Eigen AI is first provider (correct)

**Files to check**:
- `apps/tee/src/services/llm/LLMService.ts`
- Ensure EigenAIProvider with `WALLET_PRIVATE_KEY` is instantiated first
- Groq and Brave are fallbacks (correct)

### 3. Error Handling Improvements
**Issue**: Eigen AI returned 500 error during challenge generation (temporary)

**Actions**:
- Add retry logic for 500 errors
- Log detailed error responses from Eigen AI
- Ensure graceful fallback to Groq/Brave if Eigen fails

### 4. Model Configuration
**Current**: Using `gpt-oss-120b-f16` model

**Considerations**:
- This model is available on deTERMinal API
- Max tokens: 4000 (appropriate for challenge generation)
- Seed parameter: Used for deterministic results (correct)

### 5. Deployment Configuration
**Current deployment command**:
```bash
ecloud compute app deploy --name rtfm-sovereign --environment sepolia \
  --instance-type g1-standard-4t \
  --env-file .env.production \
  --repo https://github.com/Nathasan1410/RTFM-Sovereign.git \
  --commit 070dff6e65f4315a40774766a72c862bad3f2da3 \
  --build-context apps/tee \
  --build-dockerfile Dockerfile
```

**Action**: Ensure .env.production is updated before deploying

### 6. Testing Checklist
- [ ] Update .env.production with WALLET_PRIVATE_KEY
- [ ] Commit and push changes to GitHub
- [ ] Deploy to EigenCloud
- [ ] Test challenge generation via deployed endpoint
- [ ] Verify Eigen AI is being used (check logs)
- [ ] Test fallback to Groq/Brave if Eigen fails

## Summary
**Minimal changes required**:
1. Update .env.production (1 line change)
2. Optional: Improve error handling in EigenAIProvider
3. Test and deploy

The app is **already compatible** with Eigen AI deTERMinal token grants. Only environment variable update is needed for production deployment.