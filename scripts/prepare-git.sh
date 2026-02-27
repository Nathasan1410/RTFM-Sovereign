#!/usr/bin/env bash

# ==============================================================================
# RTFM-Sovereign Git Preparation Script
# ==============================================================================
# This script prepares the repository for a clean GitHub push.
# It cleans up unnecessary files, organizes documentation, and ensures
# only production-ready files are staged.
# ==============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# ==============================================================================
# Clean Up Test Files
# ==============================================================================

print_header "🧹 Cleaning Up Test Files"

# Remove test JavaScript files from root
TEST_FILES=(
    "test-frontend-api.js"
    "test-json-extraction.js"
    "test-tee-backend.js"
    "tee-response.json"
)

for file in "${TEST_FILES[@]}"; do
    if [ -f "$file" ]; then
        rm -f "$file"
        print_success "Removed $file"
    fi
done

# Remove null files
if [ -f '$null' ]; then
    rm -f '$null'
    print_success "Removed \$null file"
fi

# ==============================================================================
# Archive Old Documentation
# ==============================================================================

print_header "📚 Archiving Old Documentation"

# Create archive directory if it doesn't exist
mkdir -p docs/archive

# Move screenshots to archive
if [ -d "docs/screenshots" ]; then
    mv docs/screenshots docs/archive/
    print_success "Moved docs/screenshots to archive"
fi

# Move assets to archive (if not needed)
if [ -d "docs/assets" ] && [ "$(ls -A docs/assets 2>/dev/null)" ]; then
    mv docs/assets docs/archive/
    print_success "Moved docs/assets to archive"
fi

# Archive old status documents
OLD_DOCS=(
    "docs/STATUS.md"
    "docs/REPOSITORY_CLEANUP_GUIDE.md"
)

for doc in "${OLD_DOCS[@]}"; do
    if [ -f "$doc" ]; then
        mv "$doc" docs/archive/
        print_success "Archived $doc"
    fi
done

# ==============================================================================
# Organize App-Specific Documentation
# ==============================================================================

print_header "📁 Organizing App Documentation"

# Create app docs directories
mkdir -p apps/web/docs
mkdir -p apps/tee/docs

# Move app-specific docs
if [ -f "apps/web/README.md" ]; then
    cp apps/web/README.md apps/web/docs/README.md
    print_success "Copied apps/web/README.md to apps/web/docs/"
fi

if [ -f "apps/web/CONTRIBUTING.md" ]; then
    cp apps/web/CONTRIBUTING.md apps/web/docs/CONTRIBUTING.md
    print_success "Copied apps/web/CONTRIBUTING.md to apps/web/docs/"
fi

if [ -f "apps/web/SECURITY.md" ]; then
    cp apps/web/SECURITY.md apps/web/docs/SECURITY.md
    print_success "Copied apps/web/SECURITY.md to apps/web/docs/"
fi

if [ -f "apps/tee/README.md" ]; then
    cp apps/tee/README.md apps/tee/docs/README.md
    print_success "Copied apps/tee/README.md to apps/tee/docs/"
fi

if [ -f "apps/tee/CONTRIBUTING.md" ]; then
    cp apps/tee/CONTRIBUTING.md apps/tee/docs/CONTRIBUTING.md
    print_success "Copied apps/tee/CONTRIBUTING.md to apps/tee/docs/"
fi

# ==============================================================================
# Clean Build Artifacts
# ==============================================================================

print_header "🗑️ Cleaning Build Artifacts"

# Clean Next.js build
if [ -d ".next" ]; then
    rm -rf .next
    print_success "Cleaned .next directory"
fi

# Clean TEE build
if [ -d "apps/tee/dist" ]; then
    rm -rf apps/tee/dist
    print_success "Cleaned apps/tee/dist directory"
fi

# Clean contract artifacts (keep source)
if [ -d "packages/contracts/cache" ]; then
    rm -rf packages/contracts/cache
    print_success "Cleaned packages/contracts/cache"
fi

if [ -d "packages/contracts/out" ]; then
    rm -rf packages/contracts/out
    print_success "Cleaned packages/contracts/out"
fi

# ==============================================================================
# Verify .gitignore
# ==============================================================================

print_header "🔒 Verifying .gitignore"

if [ -f ".gitignore" ]; then
    print_success ".gitignore exists"
    
    # Check if .env is ignored
    if grep -q "^\.env$" .gitignore; then
        print_success ".env is properly ignored"
    else
        print_warning ".env might not be properly ignored"
    fi
    
    # Check if node_modules is ignored
    if grep -q "node_modules" .gitignore; then
        print_success "node_modules is properly ignored"
    else
        print_error "node_modules is not ignored!"
    fi
else
    print_error ".gitignore not found!"
    exit 1
fi

# ==============================================================================
# Check for Unintended Files
# ==============================================================================

print_header "🔍 Checking for Unintended Files"

UNINTENDED_FILES=(
    ".env.local"
    ".env.development.local"
    ".env.test.local"
    ".env.production.local"
    "apps/web/.env"
    "apps/web/.env.local"
    "apps/tee/.env"
    "apps/tee/.env.local"
    "apps/tee/.env.tee"
)

FOUND_ISSUES=0
for file in "${UNINTENDED_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_warning "Found $file (should be in .gitignore)"
        FOUND_ISSUES=1
    fi
done

if [ $FOUND_ISSUES -eq 0 ]; then
    print_success "No unintended files found"
fi

# ==============================================================================
# Git Status
# ==============================================================================

print_header "📊 Git Status"

git status --short

echo ""
print_success "Git status check complete"

# ==============================================================================
# Summary
# ==============================================================================

print_header "✅ Git Preparation Complete"

echo -e "${GREEN}Repository is ready for commit!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review the changes: git status"
echo "2. Stage changes: git add ."
echo "3. Commit: git commit -m 'chore: prepare for production release'"
echo "4. Push: git push origin main"
echo ""
echo -e "${BLUE}See docs/GITHUB_RELEASE_GUIDE.md for release instructions${NC}"
echo ""
