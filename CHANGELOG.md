# RTFM-Sovereign Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-02-22 (In Development)

### Added

#### Smart Contracts
- **RTFMVerifiableRegistry.sol**: Main registry for verifiable skill attestations
  - EIP-712 signature verification
  - State machine implementation (Idle → Staked → Attesting → Verified → Released)
  - 20/80 economic split (Treasury/User)
  - Emergency refund mechanism (7-day timeout, 5% penalty)
  - Two-phase TEE enrollment (enroll → activate → renounce)
- **RTFMFaucet.sol**: Testnet faucet for demo users
  - 0.01 ETH drip amount
  - 1-hour cooldown period
  - Reentrancy protection
- **Interfaces**: IRTFMSovereign.sol, IRTFMErrors.sol
- **Mock Contract**: RTFMSovereignMock.sol for frontend development

#### Monorepo Structure
- **pnpm workspace** setup with apps/packages separation
- **apps/web**: Next.js 16 frontend (RTFM-GPT integration)
- **apps/tee**: TEE service container (EigenCompute integration)
- **packages/contracts**: Solidity smart contracts with Foundry
- **packages/types**: Shared TypeScript definitions

#### Development Tools
- **Foundry** configuration with optimizer and via-ir
- **OpenZeppelin Contracts 5.x** integration
- **Wallet generation** script (secure key creation)
- **Balance monitoring** script for Sepolia testnet

#### Documentation
- **ARCHITECTURE.md**: System design and data flow diagrams
- **USER_GUIDE.md**: Step-by-step user tutorial
- **TEE_SPEC.md**: Confidential computing and SGX details
- **API.md**: Complete API reference (contracts + REST)
- **DEMO_SCRIPT.md**: Video planning with scene breakdown

### Security

- **EIP-712 Typed Data**: Replay attack prevention
- **ReentrancyGuard**: Protection on all value transfers
- **Checks-Effects-Interactions**: Strict pattern for state updates
- **Nonce Tracking**: Per-user replay protection
- **Two-Phase TEE Enrollment**: Proof of ownership verification
- **Ownership Renouncement**: Sovereign constraint (no admin after activation)

### Smart Contract Features

#### Staking Mechanism
- Exact amount requirement (0.001 ETH)
- Unique topic per user (no duplicate stakes)
- Automatic 7-day deadline
- State tracking (Idle, Staked, Attesting, Verified, Released)

#### Attestation Verification
- EIP-712 signature verification with domain separator
- Score threshold validation (≥ 70 to pass)
- Nonce increment for replay protection
- Atomic payout (state update + transfer in one tx)

#### Economic Model
- **Passing (score ≥ 70)**: 80% return, 20% to Treasury
- **Failing (score < 70)**: 80% return, 20% penalty to Treasury
- **Emergency Refund**: 95% return, 5% penalty (timeout only)
- **Treasury Management**: TEE-only withdrawals

### Technical Stack

#### Frontend
- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS with Brutalist design system
- **State**: Zustand + IndexedDB (local-first)
- **AI**: Cerebras Cloud SDK (Llama 3.3 70B)

#### TEE Service
- **Runtime**: Node.js on EigenCompute
- **Enclave**: Intel SGX with Gramine LibOS
- **Crypto**: ethers.js v6 for signing
- **HTTP**: Fastify (planned)

#### Smart Contracts
- **Platform**: Solidity 0.8.19
- **Testing**: Foundry (Forge)
- **Standards**: OpenZeppelin Contracts 5.x
- **Network**: Ethereum Sepolia (Chain ID: 11155111)

### Notes

- **MVP Status**: Initial release for EigenCloud OIC 2026 submission
- **Deployment**: Contracts ready for deployment (awaiting funding)
- **Student Project**: Built by [Your Name] for EigenCloud Open Innovation Challenge
- **Inspiration**: RTFM-GPT concept adapted for verifiable credentials

---

## [Unreleased]

### Planned (Future Releases)

#### [0.2.0] - Post-Hackathon
- L2 integration (Polygon/Arbitrum) for lower costs
- Multi-chain support (Sepolia + Goerli)
- Social verification (peer credential validation)
- Credential marketplace (trading/selling)
- DAO governance (community challenge creation)
- Zero-knowledge proofs (replace SGX attestation)
- Local AI models (run small models in enclave)

#### [1.0.0] - Production
- Mainnet deployment
- Multiple TEE instances (redundancy)
- Hiring bot integration (auto-verify candidates)
- Reputation system (weight by challenge difficulty)
- Enterprise features (private challenges, team verification)

---

## Version History

| Version | Date | Changes | Type |
|----------|--------|----------|--------|
| 0.1.0 | 2026-02-22 | Initial release for EigenCloud OIC 2026 | Major |

---

## Conventions

This project uses [Semantic Versioning](https://semver.org/).

- **MAJOR**: Incompatible API changes
- **MINOR**: Backwards-compatible functionality additions
- **PATCH**: Backwards-compatible bug fixes

## Links

- **Repository**: [https://github.com/yourusername/rtfm-sovereign](https://github.com/yourusername/rtfm-sovereign)
- **EigenCloud**: [https://eigencloud.xyz](https://eigencloud.xyz)
- **Open Innovation Challenge**: [https://www.eigenlayer.org/oic](https://www.eigenlayer.org/oic)

---

## Acknowledgments

Built with ☕ and 🔒 for EigenCloud Open Innovation Challenge 2026

**Special Thanks**:
- EigenLayer team for the EigenCloud infrastructure
- Intel for SGX technology
- OpenZeppelin for battle-tested contracts
- Foundry for the excellent Solidity tooling
- Cerebras for the fast AI inference
