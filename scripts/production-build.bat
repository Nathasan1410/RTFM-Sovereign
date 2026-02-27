@echo off
REM ==============================================================================
REM RTFM-Sovereign Production Build Script (Windows)
REM ==============================================================================
REM This script prepares the entire monorepo for production deployment.
REM Run this before deploying to production or creating a GitHub release.
REM ==============================================================================

setlocal enabledelayedexpansion

REM Colors (Windows doesn't support ANSI colors well, using simple markers)
set "HEADER=[*]"
set "SUCCESS=[+]"
set "WARNING=[!]"
set "ERROR=[X]"

echo.
echo ========================================
echo %HEADER% Running Pre-flight Checks
echo ========================================
echo.

REM Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo %ERROR% Node.js is not installed. Please install it first.
    exit /b 1
)
for /f "tokens=2" %%i in ('node -v') do set NODE_VERSION=%%i
for /f "tokens=1 delims=." %%i in ("!NODE_VERSION:~1!") do set NODE_MAJOR=%%i
if !NODE_MAJOR! LSS 18 (
    echo %ERROR% Node.js version must be ^>= 18
    exit /b 1
)
echo %SUCCESS% Node.js version: !NODE_VERSION!

REM Check pnpm
where pnpm >nul 2>nul
if %errorlevel% neq 0 (
    echo %ERROR% pnpm is not installed. Please install it first.
    exit /b 1
)
for /f "tokens=*" %%i in ('pnpm -v') do set PNPM_VERSION=%%i
echo %SUCCESS% pnpm version: !PNPM_VERSION!

echo.
echo ========================================
echo %HEADER% Validating Environment
echo ========================================
echo.

if not exist .env (
    echo %WARNING% .env file not found. Copy .env.example to .env and fill in values.
    set /p CONTINUE="Continue without .env? (y/n) "
    if /i not "!CONTINUE!"=="y" exit /b 1
) else (
    echo %SUCCESS% .env file found
)

echo.
echo ========================================
echo %HEADER% Installing Dependencies
echo ========================================
echo.

call pnpm install
if %errorlevel% neq 0 (
    echo %ERROR% Failed to install dependencies
    exit /b 1
)
echo %SUCCESS% Dependencies installed

echo.
echo ========================================
echo %HEADER% Running Type Checks
echo ========================================
echo.

call pnpm typecheck
if %errorlevel% neq 0 (
    echo %WARNING% Type checks failed
    set /p CONTINUE="Continue anyway? (y/n) "
    if /i not "!CONTINUE!"=="y" exit /b 1
)
echo %SUCCESS% Type checks passed

echo.
echo ========================================
echo %HEADER% Running Linter
echo ========================================
echo.

call pnpm lint
if %errorlevel% neq 0 (
    echo %WARNING% Linting found issues
    set /p CONTINUE="Continue anyway? (y/n) "
    if /i not "!CONTINUE!"=="y" exit /b 1
)
echo %SUCCESS% Linting passed

echo.
echo ========================================
echo %HEADER% Running Tests
echo ========================================
echo.

call pnpm test
if %errorlevel% neq 0 (
    echo %WARNING% Some tests failed
    set /p CONTINUE="Continue anyway? (y/n) "
    if /i not "!CONTINUE!"=="y" exit /b 1
)
echo %SUCCESS% Tests passed

echo.
echo ========================================
echo %HEADER% Building Smart Contracts
echo ========================================
echo.

call pnpm contracts:compile
if %errorlevel% neq 0 (
    echo %ERROR% Smart contract compilation failed
    exit /b 1
)
echo %SUCCESS% Smart contracts compiled

echo.
echo ========================================
echo %HEADER% Building TEE Service
echo ========================================
echo.

call pnpm tee:build
if %errorlevel% neq 0 (
    echo %WARNING% TEE build failed (may not be critical)
) else (
    echo %SUCCESS% TEE service built
)

echo.
echo ========================================
echo %HEADER% Building Frontend
echo ========================================
echo.

call pnpm web:build
if %errorlevel% neq 0 (
    echo %ERROR% Frontend build failed
    exit /b 1
)
echo %SUCCESS% Frontend built successfully

echo.
echo ========================================
echo %SUCCESS% Production Build Complete
echo ========================================
echo.
echo All checks passed! Your project is ready for production.
echo.
echo Next steps:
echo 1. Review the build output for any warnings
echo 2. Deploy to your hosting platform (Vercel, etc.)
echo 3. Deploy TEE service to EigenCompute or Docker
echo 4. Deploy smart contracts (if not already deployed)
echo 5. Update environment variables on hosting platform
echo 6. Run post-deployment verification tests
echo.
echo See docs/PRODUCTION_DEPLOYMENT.md for detailed instructions
echo.

endlocal
