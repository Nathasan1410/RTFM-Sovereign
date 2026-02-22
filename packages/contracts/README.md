# RTFM-Sovereign Smart Contracts

This package contains the Solidity smart contracts for the RTFM-Sovereign platform.

## Architecture & Specification

The detailed technical specification and architecture decisions are documented in [smart-contract-spec.md](../../specs/smart-contract-spec.md).

**Key Features:**
- **Immutable Logic:** No proxy patterns, strict security.
- **TEE Integration:** Verifiable execution via EigenCompute TEE agents.
- **EIP-712 Signatures:** Secure, typed data signing for attestations.
- **Economic Model:** 20/80 split (Treasury/User) with slashing mechanism.

## Development

### Prerequisites
- [Foundry](https://book.getfoundry.sh/)
- [OpenZeppelin Contracts 5.x](https://docs.openzeppelin.com/contracts/5.x/)

### Commands

```bash
# Build contracts
pnpm build

# Run tests
pnpm test

# Deploy to Sepolia
pnpm deploy:sepolia
```

## Directory Structure

```
contracts/
├── src/                # Contract source code
│   ├── RTFMVerifiableRegistry.sol
│   └── interfaces/
├── test/               # Foundry tests
├── script/             # Deployment scripts
└── foundry.toml        # Foundry configuration
```
