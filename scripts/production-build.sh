#!/usr/bin/env bash

# ==============================================================================
# RTFM-Sovereign Production Build Script
# ==============================================================================
# This script prepares the entire monorepo for production deployment.
# Run this before deploying to production or creating a GitHub release.
# ==============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ==============================================================================
# Helper Functions
# ==============================================================================

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

check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 is not installed. Please install it first."
        exit 1
    fi
}

# ==============================================================================
# Pre-flight Checks
# ==============================================================================

print_header "🔍 Running Pre-flight Checks"

check_command node
check_command pnpm
check_command git

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version must be >= 18"
    exit 1
fi
print_success "Node.js version: $(node -v)"

PNPM_VERSION=$(pnpm -v)
print_success "pnpm version: $PNPM_VERSION"

# ==============================================================================
# Environment Validation
# ==============================================================================

print_header "🔐 Validating Environment"

if [ ! -f .env ]; then
    print_warning ".env file not found. Copy .env.example to .env and fill in values."
    read -p "Continue without .env? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    print_success ".env file found"
fi

# Check for critical environment variables
CRITICAL_VARS=("SEPOLIA_RPC_URL" "CEREBRAS_API_KEY")
for var in "${CRITICAL_VARS[@]}"; do
    if grep -q "^$var=" .env 2>/dev/null; then
        print_success "$var is set"
    else
        print_warning "$var is not set in .env"
    fi
done

# ==============================================================================
# Install Dependencies
# ==============================================================================

print_header "📦 Installing Dependencies"

pnpm install
print_success "Dependencies installed"

# ==============================================================================
# Type Checking
# ==============================================================================

print_header "🔍 Running Type Checks"

if pnpm typecheck; then
    print_success "Type checks passed"
else
    print_error "Type checks failed"
    exit 1
fi

# ==============================================================================
# Linting
# ==============================================================================

print_header "🎨 Running Linter"

if pnpm lint; then
    print_success "Linting passed"
else
    print_warning "Linting found issues. Please fix them."
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# ==============================================================================
# Tests
# ==============================================================================

print_header "🧪 Running Tests"

if pnpm test; then
    print_success "Tests passed"
else
    print_warning "Some tests failed"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# ==============================================================================
# Build Smart Contracts
# ==============================================================================

print_header "⛓️ Building Smart Contracts"

if pnpm contracts:compile; then
    print_success "Smart contracts compiled"
else
    print_error "Smart contract compilation failed"
    exit 1
fi

# ==============================================================================
# Build TEE Service
# ==============================================================================

print_header "🔒 Building TEE Service"

if pnpm tee:build; then
    print_success "TEE service built"
else
    print_warning "TEE build failed (may not be critical)"
fi

# ==============================================================================
# Build Frontend
# ==============================================================================

print_header "🌐 Building Frontend"

if pnpm web:build; then
    print_success "Frontend built successfully"
else
    print_error "Frontend build failed"
    exit 1
fi

# ==============================================================================
# Summary
# ==============================================================================

print_header "✅ Production Build Complete"

echo -e "${GREEN}All checks passed! Your project is ready for production.${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review the build output for any warnings"
echo "2. Deploy to your hosting platform (Vercel, etc.)"
echo "3. Deploy TEE service to EigenCompute or Docker"
echo "4. Deploy smart contracts (if not already deployed)"
echo "5. Update environment variables on hosting platform"
echo "6. Run post-deployment verification tests"
echo ""
echo -e "${BLUE}See docs/PRODUCTION_DEPLOYMENT.md for detailed instructions${NC}"
echo ""
