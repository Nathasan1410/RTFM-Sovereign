# Plan: Fix TypeScript Build Errors and Redeploy

## Goal
Fix the TypeScript compilation errors (`TS2550`, `TS2304`) causing the EigenCloud deployment build to fail, then successfully deploy the TEE application.

## Problem Analysis
The build failed with errors from `node_modules/ox` (a dependency):
1.  `Property 'replaceAll' does not exist on type 'string'` -> Needs `ES2021` or later.
2.  `Cannot find name 'window'`, `AuthenticatorAttestationResponse`, etc. -> Needs `DOM` library types, even though we are running in Node.js (common issue with universal libraries).

## Step-by-Step Execution Plan

### Phase 1: Fix TypeScript Configuration
1.  **Modify `apps/tee/tsconfig.json`**:
    - Update `compilerOptions.target` to `ES2022` (or at least `ES2021`).
    - Update `compilerOptions.lib` to include `["ES2022", "DOM"]`.
        - `ES2022` fixes `replaceAll`.
        - `DOM` fixes `window` and WebAuthn types.

### Phase 2: Git Sync
1.  **Stage & Commit**:
    - Stage `apps/tee/tsconfig.json`.
    - Commit with message: `fix: update tsconfig lib to support viem/ox dependencies`.
2.  **Push**:
    - Push changes to `origin/master`.
    - Retrieve the new **Commit SHA**.

### Phase 3: Redeploy
1.  **Execute Deployment**:
    - Run `ecloud compute app deploy` with the new commit SHA.
    - Ensure `build-context` is `apps/tee` and `build-dockerfile` is `Dockerfile`.

## Execution Order
1.  Update `tsconfig.json`
2.  Git Commit & Push
3.  Get Commit SHA
4.  Deploy App
