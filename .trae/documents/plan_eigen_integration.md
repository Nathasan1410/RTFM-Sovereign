# Plan: Integrate Frontend with TEE Service & Remove Client-Side Keys

## Goal
Connect the Next.js frontend directly to the TEE Service (Eigen AI) for challenge generation, removing the need for users to input their own API keys (Groq/Cerebras) in the browser. This aligns with the "Sovereign" architecture where the TEE handles AI operations securely.

## 1. Frontend API Route Modification (`apps/web/app/api/generate/route.ts`)
**Current State**: Checks for `x-api-key-groq` or `x-api-key-cerebras` headers. If missing, throws 400 error.
**Target State**: 
- Remove API key checks.
- Forward the request to the local TEE service (`http://localhost:3001/challenge/generate`).
- **Challenge**: The TEE service currently returns a different JSON structure ("Quiz" format) than what the frontend expects ("Roadmap" format).
- **Solution**: Update the TEE service to generate the "Roadmap" format required by the frontend.

## 2. TEE Service Update (`apps/tee`)
**Files to Modify**:
- `apps/tee/src/services/llm/types.ts`: Update `Challenge` interface to match the frontend's expected roadmap structure (modules with context, docs, challenge, verificationCriteria).
- `apps/tee/src/services/llm/EigenAIProvider.ts`: Update the prompt to generate the "Roadmap" structure instead of the "Quiz" structure.
- `apps/tee/src/agents/ArchitectAgent.ts`: Ensure it passes the new structure through correctly.

## 3. Frontend UI Cleanup (`apps/web`)
- **Settings Page**: Remove the "API Configuration" section from `apps/web/components/settings-dialog.tsx` (or similar).
- **Home Page**: Remove any client-side checks or warnings about missing API keys.
- **Store**: Update `apps/web/lib/store.ts` to remove `apiKeys` slice if no longer needed.

## 4. Verify & Test
- Restart TEE service with new logic.
- Restart Web frontend.
- Generate a roadmap from the frontend.
- Verify that:
    1. No API keys are requested.
    2. The request goes to TEE service (port 3001).
    3. The TEE service calls Eigen AI (via wallet grant).
    4. The response renders correctly on the frontend.

## 5. Bonus: Fix Window.ethereum Error
- Check `apps/web/config/wagmi.ts` or `Providers.tsx` to ensure proper initialization that doesn't conflict with other extensions.

## Detailed Steps

### Step 1: Update TEE Service Types & Prompt
- Modify `Challenge` interface in `apps/tee/src/services/llm/types.ts` to match frontend's `GenerateResponse` schema.
- Update prompt in `EigenAIProvider.ts` to request the roadmap format (Project-Based Micro-Chunking).

### Step 2: Update TEE Service Controller
- Ensure `apps/tee/src/server.ts` endpoint `/challenge/generate` returns the data in the correct format.

### Step 3: Update Frontend API Route
- Rewrite `apps/web/app/api/generate/route.ts` to proxy requests to `http://localhost:3001/challenge/generate`.

### Step 4: UI Cleanup
- Remove API key inputs from Settings.
- Remove warnings from Home page.

### Step 5: Verification
- Run full flow test.
