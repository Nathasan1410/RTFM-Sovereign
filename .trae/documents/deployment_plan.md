# Deployment Plan for RTFM Sovereign TEE

## Goal

Deploy the RTFM Sovereign TEE service to EigenCloud/EigenCompute using verifiable builds from GitHub.

## Current State

* **Project**: RTFM Sovereign (EigenLayer Hackathon)

* **Local Environment**: Windows (Docker unavailable)

* **Deployment Method**: Verifiable Build (GitHub Source)

* **Dependencies**:

  * `ecloud` CLI (installed)

  * GitHub Repo: `https://github.com/Nathasan1410/RTFM-Sovereign.git`

  * Environment Config: `.env.production` (ready with keys)

## Step-by-Step Execution Plan

### Phase 1: Preparation & Git Sync

1. **Add and Commit Changes**:

   * Commit all modified files: `ArchitectAgent.ts`, `SwarmOrchestrator.ts`, `server.ts`, `LLMService.ts`.

   * Commit new files: `BraveProvider.ts`, `HyperbolicProvider.ts`, `.env.example`, `.npmrc`.

   * **Note**: Do NOT commit `.env.production` or `.env.test` (secrets). We will pass `.env.production` during deployment command.
2. **Push to GitHub**:

   * Push changes to `origin/master`.

   * Retrieve the latest **Commit SHA** for deployment.

### Phase 2: EigenCloud Setup

1. **Activate Billing**:

   * Run `ecloud billing subscribe` to enable compute resources.

   * Confirm subscription status with `ecloud billing status`.

### Phase 3: Deployment (Verifiable Build)

1. **Deploy Command**:

   * Execute `ecloud compute app deploy` using the GitHub repo and commit SHA.

   * Configuration:

     * Name: `rtfm-sovereign`

     * Environment: `sepolia`

     * Region: `us-west-2` (or available region)

     * Instance Type: `sgx.large` (or `g1-standard-4t` as seen in help output)

     * Env File: `.env.production`

     * Repo: `https://github.com/Nathasan1410/RTFM-Sovereign.git`

     * Commit: `<COMMIT_SHA>`

     * Build Context: `apps/tee` (since Dockerfile is there)

     * Dockerfile Path: `Dockerfile` (relative to build context)

### Phase 4: Verification

1. **Check App Status**:

   * Run `ecloud compute app list` to see deployment status.

   * Run `ecloud compute app logs --name rtfm-sovereign` to inspect startup logs.
2. **Verify TEE Service**:

   * Ensure the service is running and listening on the expected port.

## Execution Order

1. Git Commit & Push
2. Get Commit SHA
3. Activate Billing
4. Deploy App
5. Verify Deployment

