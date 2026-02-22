/app/                          # Application code (read-only)
├── dist/                        # Compiled JavaScript (immutable)
│   ├── index.js                 # Entry point
│   ├── agents/                   # Compiled agent classes
│   └── crypto/                   # Compiled crypto utilities
├── src/                         # Source TypeScript (dev only, excluded from final image)
│   ├── index.ts                  # HTTP server bootstrap
│   ├── config/
│   │   ├── env.ts                # Environment schema validation (Zod)
│   │   ├── constants.ts           # Immutable constants
│   │   └── paths.ts                # File system paths abstraction
│   ├── agents/
│   │   ├── architect.ts            # Business logic (ported from RTFM-GPT)
│   │   ├── specialist.ts           # Business logic (ported from RTFM-GPT)
│   │   └── index.ts               # Barrel export
│   ├── services/
│   │   ├── cerebras.ts             # HTTP client with circuit breaker
│   │   └── health.ts               # Health check logic
│   ├── types/
│   │   └── index.ts               # Shared interfaces
│   └── utils/
│       ├── logger.ts               # Pino logger with redaction
│       └── errors.ts               # Custom error classes
├── sealed/                       # Gramine Protected Filesystem (encrypted)
│   ├── cerebras-key.txt           # Cerebras API key (sealed)
│   └── tee-identity.json         # Public key cache
├── tmp/                         # Scratch space (unencrypted, ephemeral)
├── gramine/                     # Gramine configuration
│   ├── entrypoint.manifest.template
│   └── entrypoint.sig            # Generated during build
├── Dockerfile.tee              # Multi-stage build specification
├── tsconfig.json                 # TypeScript compiler config
└── package.json                  # Dependencies (production only)
