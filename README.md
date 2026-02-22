# RTFM-Sovereign | EigenCloud OIC 2026 Entry

![Version](https://img.shields.io/badge/version-1.0.0-green)
![License](https://img.shields.io/badge/license-MIT-blue)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![EigenLayer](https://img.shields.io/badge/EigenLayer-Sovereign-orange)

> **Read The F*cking Manual - Sovereign Edition**

RTFM-Sovereign is an AI-powered learning platform that combines the RTFM-GPT educational experience with verifiable TEE-based agent execution and on-chain credential verification. Built for the EigenCloud OIC 2026 hackathon.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        RTFM-Sovereign                        │
├─────────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐    ┌─────────────┐    ┌───────────────┐   │
│  │  Next.js    │───▶│  TEE Agent  │───▶│  Blockchain   │   │
│  │  Web App    │    │  (EigenComp.)│    │  (Sepolia)    │   │
│  └─────────────┘    └─────────────┘    └───────────────┘   │
│         │                  │                   │               │
│         ▼                  ▼                   ▼               │
│   User Interface    Attestation         Credential Registry   │
│   (apps/web)       Verification         (Smart Contracts)      │
│                                          (packages/...)      │
│                                                               │
└─────────────────────────────────────────────────────────────────┘
```

## Monorepo Structure

This is a **pnpm workspace** monorepo with the following structure:

```
rtfm-sovereign/
├── apps/
│   ├── web/                    # Next.js 16 frontend (RTFM-GPT)
│   │   ├── app/               # App Router pages
│   │   ├── components/         # React components
│   │   └── lib/               # Utilities and agents
│   └── tee/                    # TEE container service
│       ├── src/
│       │   ├── agents/         # Agent logic ported from web
│       │   ├── server.ts       # FastAPI/Express entry
│       │   └── crypto/         # Signing and attestation
│       └── Dockerfile.tee
├── packages/
│   ├── contracts/              # Solidity smart contracts
│   │   ├── src/
│   │   │   ├── RTFMVerifiableRegistry.sol
│   │   │   └── RTFMFaucet.sol
│   │   ├── test/               # Foundry tests
│   │   └── script/             # Deployment scripts
│   └── types/                  # Shared TypeScript types
│       ├── src/
│       │   ├── attestation.ts   # TEE output interfaces
│       │   ├── contract.ts      # Contract ABI types
│       │   └── agent.ts        # Shared agent types
├── scripts/                    # Utility scripts
│   ├── generate-wallet.js       # Wallet generation
│   └── check-balance.js        # Balance monitoring
├── .env.example                # Environment templates
├── package.json                # Root workspace config
└── pnpm-workspace.yaml         # pnpm workspace definition
```

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Git

### Installation

1. **Clone the repo**
   ```bash
   git clone https://github.com/yourusername/rtfm-sovereign.git
   cd rtfm-sovereign
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and configuration
   ```

### Development

```bash
# Run web app
pnpm web:dev

# Build web app
pnpm web:build

# Test contracts
pnpm contracts:test

# Check wallet balance
node scripts/check-balance.js
```

## The Workflow

1. **Generate**: Enter a topic you want to master in the web app
2. **Read**: Click links to official documentation
3. **Challenge**: Solve challenges based on what you read
4. **Verify**: Submit to TEE agent for attestation
5. **Earn**: Receive verifiable on-chain credentials

## Tech Stack

### Frontend (apps/web)
- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS (Brutalist Design System)
- **State Management**: Zustand + IndexedDB (Local-first)
- **AI**: Cerebras Cloud SDK (Llama 3.3 70B)
- **PWA**: Offline-first architecture

### TEE Service (apps/tee)
- **Runtime**: Node.js with EigenCompute
- **Framework**: Fastify/Express
- **Crypto**: ethers.js v6 (signing)
- **Attestation**: Gramine/SGX

### Smart Contracts (packages/contracts)
- **Framework**: Foundry (Forge)
- **Standards**: OpenZeppelin Contracts v5
- **Network**: Ethereum Sepolia Testnet

### Shared Types (packages/types)
- TypeScript definitions for cross-package type safety

## Sepolia Deployment Status

### Development Wallet
- **Address**: `0x4DF66E441dEC0FcbFCd1464618f8D44eb2cAb0ad`
- **Network**: Sepolia Testnet
- **Balance**: Check with `node scripts/check-balance.js`

### Contracts (to be deployed in Chunk 5)
- Registry Contract: TBD
- Faucet Contract: TBD

## Faucet Funding

Current wallet balance: **0 ETH**

To fund the wallet for testing:
- [Alchemy Faucet](https://sepoliafaucet.com) - 0.5 SEP/day
- [Infura Faucet](https://www.infura.io/faucet/sepolia) - 0.5 SEP
- [PoW Faucet](https://sepolia-faucet.pk910.de/) - Variable

## Data Privacy

RTFM-Sovereign follows a **Local-First** architecture. All your roadmaps and progress are stored locally in your browser (IndexedDB). TEE attestation ensures verifiable execution without storing personal data on our servers.

## Security

- Private keys are never committed to git (see `.gitignore`)
- TEE execution provides cryptographic attestation
- On-chain verification ensures credential authenticity

## License

MIT © 2024 Nathanael Santoso

## Links

- [Etherscan - Dev Wallet](https://sepolia.etherscan.io/address/0x4DF66E441dEC0FcbFCd1464618f8D44eb2cAb0ad)
- [EigenCloud OIC 2026](https://www.eigenlayer.org/)
