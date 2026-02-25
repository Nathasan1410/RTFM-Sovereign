# 🧹 Complete Repository Cleanup Guide

**Date:** 2026-02-25  
**Status:** In Progress  
**Goal:** Clean, organized, monorepo-ready structure

---

## 📊 Current Issues

### 1. ❌ Redundant `./app` Folder

**Problem:**
- `./app` - Old Next.js app directory (root level)
- `./apps/web/app` - Current Next.js app directory (workspace)

**Files in `./app`:**
```
app/
├── page.tsx              ← Old homepage
├── layout.tsx            ← Old layout
├── roadmap/[id]/page.tsx ← Old roadmap page
└── api/                  ← Old API routes
```

**Solution:** DELETE `./app` folder (all files moved to `./apps/web/app`)

---

### 2. ❌ Scattered Test Files

**Current Test Locations (177+ files):**
```
./apps/web/__tests__/              ← Web app tests (KEEP)
./apps/web/rtfm-temp/lib/utils.test.ts  ← Duplicate test (MOVE)
./apps/tee/src/__tests__/          ← TEE backend tests (KEEP)
./apps/tee/test/                   ← Old TEE tests (ARCHIVE)
./packages/contracts/test/         ← Contract tests (KEEP)
./lib/utils.test.ts                ← Root test (MOVE)
./apps/web/lib/utils.test.ts       ← Duplicate test (DELETE)
```

**Plus:** 100+ OpenZeppelin test files in `./packages/contracts/lib/openzeppelin-contracts/test/`

**Solution:**
- Keep tests next to their source code
- Archive old/duplicate tests
- Create test documentation

---

### 3. ❌ Multiple `rtfm-temp` Folders

**Found:**
- `./apps/web/rtfm-temp/` - Old temp version
- `./apps/web/rtfm-temp/docs/` - Duplicate docs

**Solution:** DELETE `./apps/web/rtfm-temp/` (already organized in `./docs/`)

---

### 4. ❌ Random Test Files in Root

**Found:**
```
test-verify.json
test-verify2.json
test-verify-eigen.json
test-verify-js.json
test_home.html
test-roadmap.json
```

**Solution:** MOVE to `./docs/archive/test-artifacts/`

---

## ✅ Target Structure

### Clean Root Directory
```
D:\Projekan\Eigen-Layer-Hackathon\
├── .gitignore
├── README.md              ← Main overview
├── CONTRIBUTING.md        ← How to contribute
├── SECURITY.md            ← Security policy
├── CHANGELOG.md           ← Version history
├── Roadmap.md             ← Project roadmap
├── package.json           ← Root package (workspace)
├── pnpm-workspace.yaml    ← Workspace config
├── docs/                  ← All documentation
├── apps/                  ← Applications
│   ├── web/               ← Main web app
│   └── tee/               ← TEE backend
├── packages/              ← Shared packages
│   └── contracts/         ← Smart contracts
└── [config files only]
```

### Documentation Structure
```
docs/
├── README.md              ← Docs hub
├── user-guide/            ← User documentation
├── technical/             ← Technical docs
├── business/              ← Business docs
├── hackathon/             ← Hackathon submission
├── reports/               ← Implementation reports
├── archive/               ← Historical docs
└── testing/               ← ← NEW: Test documentation
    ├── README.md          ← Testing guide
    ├── web-tests/         ← Web app test docs
    ├── tee-tests/         ← TEE backend test docs
    └── contract-tests/    ← Contract test docs
```

### Test Structure
```
apps/web/__tests__/        ← Web tests (organized by feature)
├── components/
├── hooks/
├── integration/
└── e2e/

apps/tee/src/__tests__/    ← TEE tests (organized by module)
├── contracts/
├── services/
├── integration/
└── e2e/

packages/contracts/test/   ← Contract tests
├── SkillStaking.test.ts
└── SkillAttestation.test.ts
```

---

## 📋 Cleanup Checklist

### Phase 1: Remove Redundant Files

- [ ] DELETE `./app` folder (redundant with `./apps/web/app`)
- [ ] DELETE `./apps/web/rtfm-temp/` (docs already in `./docs/`)
- [ ] DELETE `./lib/utils.test.ts` (duplicate of `./apps/web/lib/utils.test.ts`)
- [ ] MOVE root test files (`test-*.json`, `test_*.html`) to `./docs/archive/test-artifacts/`

### Phase 2: Organize Test Documentation

- [ ] CREATE `./docs/testing/README.md` (testing guide)
- [ ] CREATE `./docs/testing/web-tests/README.md`
- [ ] CREATE `./docs/testing/tee-tests/README.md`
- [ ] CREATE `./docs/testing/contract-tests/README.md`

### Phase 3: Archive Old Tests

- [ ] MOVE `./apps/tee/test/` to `./docs/archive/old-tee-tests/`
- [ ] MOVE duplicate test files to archive
- [ ] UPDATE `.gitignore` for test artifacts

### Phase 4: Update Documentation

- [ ] UPDATE `./docs/README.md` with test docs links
- [ ] UPDATE `./README.md` with new structure
- [ ] CREATE migration guide for contributors

---

## 🔧 Step-by-Step Instructions

### Step 1: Delete Redundant `./app` Folder

**BEFORE YOU DELETE:**
1. Verify `./apps/web/app` has all current files
2. Check if any custom routes exist in `./app`
3. Backup if unsure

**DELETE:**
```bash
# PowerShell
Remove-Item -Path ".\app" -Recurse -Force

# OR manually delete the folder
```

**WHY:** All active app files are in `./apps/web/app`

---

### Step 2: Delete `./apps/web/rtfm-temp`

**BEFORE YOU DELETE:**
1. Verify docs are in `./docs/`
2. Check for any unique files

**DELETE:**
```bash
# PowerShell
cd apps/web
Remove-Item -Path ".\rtfm-temp" -Recurse -Force
```

**WHY:** Documentation already organized in `./docs/`

---

### Step 3: Clean Up Test Files

**MOVE to Archive:**
```bash
# PowerShell
cd "D:\Projekan\Eigen-Layer-Hackathon"

# Create archive folder
New-Item -Path "docs\archive\test-artifacts" -ItemType Directory -Force

# Move test files
Move-Item -Path "test-*.json" -Destination "docs\archive\test-artifacts\" -Force
Move-Item -Path "test_*.html" -Destination "docs\archive\test-artifacts\" -Force
Move-Item -Path "test-*.md" -Destination "docs\archive\test-artifacts\" -Force
```

**DELETE Duplicates:**
```bash
# PowerShell
Remove-Item -Path ".\lib\utils.test.ts" -Force
```

---

### Step 4: Create Test Documentation

**CREATE `docs/testing/README.md`:**
```markdown
# Testing Guide

## Test Structure

### Web App Tests
Location: `apps/web/__tests__/`
- Component tests: `__tests__/components/`
- Hook tests: `__tests__/hooks/`
- Integration tests: `__tests__/integration/`

### TEE Backend Tests
Location: `apps/tee/src/__tests__/`
- Contract tests: `__tests__/contracts/`
- Service tests: `__tests__/services/`
- Integration tests: `__tests__/integration/`

### Contract Tests
Location: `packages/contracts/test/`
- Foundry tests: `test/*.t.sol`
- JavaScript tests: `test/*.test.ts`

## Running Tests

### Web App
```bash
cd apps/web
npm run test          # Jest tests
npm run test:unit     # Vitest tests
npm run test:e2e      # Playwright E2E
```

### TEE Backend
```bash
cd apps/tee
npm run test
```

### Contracts
```bash
cd packages/contracts
forge test
```
```

---

## 📊 Impact Analysis

### Files to Delete
| Folder/File | Count | Safe to Delete? |
|-------------|-------|-----------------|
| `./app` | 17 files | ✅ YES (redundant) |
| `./apps/web/rtfm-temp` | 50+ files | ✅ YES (docs moved) |
| `./lib/utils.test.ts` | 1 file | ✅ YES (duplicate) |
| Root test files | 6 files | ✅ YES (archive) |

### Files to Keep
| Folder/File | Count | Reason |
|-------------|-------|--------|
| `./apps/web/__tests__/` | 17 files | ✅ Current web tests |
| `./apps/tee/src/__tests__/` | 15 files | ✅ Current TEE tests |
| `./packages/contracts/test/` | 100+ files | ✅ Contract tests (OpenZeppelin) |

---

## 🎯 Benefits

### Before Cleanup
- ❌ 2 app directories (confusing)
- ❌ Tests scattered everywhere
- ❌ No test documentation
- ❌ Duplicate test files
- ❌ Root directory cluttered

### After Cleanup
- ✅ Single app directory (`./apps/web/app`)
- ✅ Tests organized by package
- ✅ Complete test documentation
- ✅ No duplicates
- ✅ Clean root directory

---

## ⚠️ Warnings

### DO NOT DELETE:
1. `./apps/web/app` - This is the CURRENT app
2. `./apps/web/__tests__` - Current web tests
3. `./apps/tee/src/__tests__` - Current TEE tests
4. `./packages/contracts/test` - Contract tests (OpenZeppelin lib)

### BACKUP FIRST:
```bash
# Create backup
Copy-Item -Path "." -Destination "../RTFM-BACKUP" -Recurse
```

---

## 📝 Post-Cleanup Tasks

### Update Documentation
- [ ] Update `README.md` with new structure
- [ ] Update `CONTRIBUTING.md` with test locations
- [ ] Add test guide to `docs/testing/`

### Update CI/CD
- [ ] Check GitHub Actions paths
- [ ] Update test commands if needed
- [ ] Verify coverage reports

### Update Team
- [ ] Announce new structure
- [ ] Share test documentation
- [ ] Update onboarding docs

---

**Last Updated:** 2026-02-25  
**Next Action:** Execute Phase 1 (delete redundant files)
