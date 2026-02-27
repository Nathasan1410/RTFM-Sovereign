# GitHub Release Preparation Guide

## Pre-Release Checklist

### Code Quality
- [ ] All tests passing (`pnpm test`)
- [ ] No TypeScript errors (`pnpm typecheck`)
- [ ] No ESLint warnings (`pnpm lint`)
- [ ] Code formatted with Prettier
- [ ] No console.log() in production code
- [ ] No TODO comments in critical paths

### Documentation
- [ ] README.md is up to date
- [ ] CHANGELOG.md includes all changes
- [ ] API.md reflects current endpoints
- [ ] Architecture diagrams updated
- [ ] Deployment guide tested
- [ ] User guide complete

### Security
- [ ] No `.env` files committed
- [ ] No private keys in code
- [ ] No API keys in code
- [ ] `.gitignore` is comprehensive
- [ ] Security audit completed
- [ ] Vulnerability scan clean

### Performance
- [ ] Bundle size optimized
- [ ] Images compressed
- [ ] Lazy loading implemented
- [ ] Code splitting working
- [ ] Lighthouse score > 90

---

## Creating a GitHub Release

### 1. Update Version Numbers

**package.json:**
```json
{
  "name": "rtfm-sovereign",
  "version": "1.0.0"
}
```

**apps/web/package.json:**
```json
{
  "name": "@rtfm/web",
  "version": "1.0.0"
}
```

**apps/tee/package.json:**
```json
{
  "name": "@rtfm/tee",
  "version": "1.0.0"
}
```

**packages/contracts/package.json:**
```json
{
  "name": "@rtfm/contracts",
  "version": "1.0.0"
}
```

### 2. Update CHANGELOG.md

```markdown
## [1.0.0] - 2026-02-28

### Added
- Smart contract staking system
- TEE-powered attestation
- AI challenge generation
- Frontend application

### Changed
- Improved error handling
- Enhanced security measures

### Fixed
- Bug fixes and performance improvements
```

### 3. Create Git Tag

```bash
# Commit all changes
git add .
git commit -m "chore: prepare for v1.0.0 release"

# Create tag
git tag -a v1.0.0 -m "Release v1.0.0 - Initial production release"

# Push tag
git push origin v1.0.0
```

### 4. Create Release on GitHub

**Via GitHub UI:**
1. Go to Releases → Create a new release
2. Select tag: `v1.0.0`
3. Title: "RTFM-Sovereign v1.0.0 - Initial Release"
4. Description: Use template below
5. Attach binaries (if applicable)
6. Check "Set as latest release"
7. Click "Publish release"

**Via GitHub CLI:**
```bash
gh release create v1.0.0 \
  --title "RTFM-Sovereign v1.0.0" \
  --notes-file RELEASE_NOTES.md \
  --latest
```

---

## Release Notes Template

```markdown
## 🎉 What's New

RTFM-Sovereign v1.0.0 is the initial production release of our decentralized skill verification platform.

### 🚀 Key Features

- **TEE-Powered Verification**: Challenges generated and graded in Intel SGX enclaves
- **Cryptographic Attestations**: EIP-712 signed credentials on Ethereum
- **AI-Generated Challenges**: Personalized challenges using Cerebras Llama 3.3 70B
- **Economic Commitment**: 0.001 ETH stake ensures serious participation
- **Modern UI**: Next.js 16 with responsive design

### 📦 Smart Contracts

- **RTFMVerifiableRegistry**: `0x7006e886e56426Fbb942B479AC8eF5C47a7531f1`
- **RTFMFaucet**: `0xA607F8A4E5c35Ca6a81623e4B20601205D1d7790`
- **Network**: Sepolia Testnet (11155111)

### 🔗 Links

- **Live Demo**: [rtfm-sovereign.vercel.app](https://rtfm-sovereign.vercel.app)
- **Documentation**: [docs/](docs/)
- **API Reference**: [API.md](docs/API.md)

### 📊 Metrics

- Total Lines of Code: ~15,000
- Test Coverage: ~75%
- Page Load Time: ~1.5s
- Gas per Stake: ~85k

### 🐛 Bug Fixes

- Fixed challenge generation timeout
- Improved error messages
- Enhanced mobile responsiveness

### 📝 Documentation

- Complete architecture documentation
- API reference guide
- User tutorial
- Deployment guide

### 🙏 Acknowledgments

Built for EigenCloud OIC 2026 Hackathon.

Special thanks to:
- EigenLayer team
- Cerebras for AI compute
- OpenZeppelin for security libraries

### 📄 License

MIT © 2026 Nathanael Santoso
```

---

## Repository Cleanup

### Files to Archive (Move to docs/archive/)

```bash
# Move old/unused documentation
mv docs/screenshots/ docs/archive/
mv docs/assets/ docs/archive/
mv docs/STATUS.md docs/archive/
mv docs/REPOSITORY_CLEANUP_GUIDE.md docs/archive/
```

### Files to Keep in Root

```
README.md
CONTRIBUTING.md
SECURITY.md
LICENSE
CHANGELOG.md
Roadmap.md
package.json
pnpm-workspace.yaml
```

### Files to Keep in docs/

```
docs/README.md (index)
docs/home.md
docs/INDEX.md
docs/USER_GUIDE.md
docs/TROUBLESHOOTING.md
docs/DEPLOYMENT.md
docs/PRODUCTION_DEPLOYMENT.md
docs/GITHUB_RELEASE_GUIDE.md
docs/technical/
docs/business/
docs/user-guide/
docs/testing/
docs/hackathon/
```

---

## Branch Protection Rules

### Recommended Settings

**Branch: `main`**
- [ ] Require pull request reviews before merging
- [ ] Require status checks to pass before merging
- [ ] Require branches to be up to date before merging
- [ ] Require conversation resolution before merging
- [ ] Include administrators

**Status Checks:**
- [ ] lint
- [ ] test
- [ ] build
- [ ] typecheck

---

## GitHub Actions Setup

### CI/CD Workflow

Create `.github/workflows/ci.yml`:

```yaml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm typecheck

  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm web:build
      - run: pnpm contracts:compile
```

---

## Post-Release Tasks

### Immediate (Day 1)
- [ ] Verify release is published
- [ ] Check all links work
- [ ] Monitor for critical bugs
- [ ] Respond to issues/PRs

### Short-term (Week 1)
- [ ] Collect user feedback
- [ ] Monitor performance metrics
- [ ] Address critical bugs
- [ ] Update documentation based on feedback

### Long-term (Month 1)
- [ ] Plan next release (v1.1.0)
- [ ] Review feature requests
- [ ] Security audit
- [ ] Performance optimization

---

## Release Communication

### Social Media Template

```
🚀 Excited to announce RTFM-Sovereign v1.0.0!

A decentralized skill verification platform powered by:
🔒 Intel SGX TEEs
🤖 AI-generated challenges
⛓️ Ethereum attestations

Try it now: rtfm-sovereign.vercel.app

Built for #EigenCloudOIC2026 @eigenlayer

#Ethereum #Web3 #AI #OpenSource
```

### Discord/Telegram Announcement

```
🎉 **RTFM-Sovereign v1.0.0 Released!**

We're live with our initial production release!

**Features:**
✅ TEE-powered verification
✅ AI challenges
✅ On-chain attestations
✅ Modern UI

**Try it:** https://rtfm-sovereign.vercel.app
**Docs:** https://github.com/your-org/rtfm-sovereign/tree/main/docs

Feedback welcome! 🙏
```

---

## Version Naming Convention

This project uses [Semantic Versioning](https://semver.org/):

- **MAJOR.MINOR.PATCH** (e.g., 1.0.0)
- **MAJOR**: Incompatible API changes
- **MINOR**: Backwards-compatible functionality
- **PATCH**: Backwards-compatible bug fixes

### Example Versions

| Version | Type | Description |
|---------|------|-------------|
| 1.0.0 | Major | Initial release |
| 1.0.1 | Patch | Bug fixes |
| 1.1.0 | Minor | New features |
| 2.0.0 | Major | Breaking changes |

---

## Release Checklist Summary

### Pre-Release
- [ ] Code quality checks pass
- [ ] Documentation updated
- [ ] Security audit complete
- [ ] Version numbers updated
- [ ] CHANGELOG updated

### Release
- [ ] Git tag created
- [ ] GitHub release created
- [ ] Release notes published
- [ ] Assets attached (if applicable)

### Post-Release
- [ ] Deployment verified
- [ ] Monitoring active
- [ ] Communication sent
- [ ] Feedback collected

---

*Last Updated: 2026-02-28*
*Version: 1.0.0*
