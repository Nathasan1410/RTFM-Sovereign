@echo off
REM ==============================================================================
REM RTFM-Sovereign Git Preparation Script (Windows)
REM ==============================================================================
REM This script prepares the repository for a clean GitHub push.
REM It cleans up unnecessary files, organizes documentation, and ensures
REM only production-ready files are staged.
REM ==============================================================================

setlocal enabledelayedexpansion

echo.
echo ========================================
echo [*] Cleaning Up Test Files
echo ========================================
echo.

REM Remove test JavaScript files from root
if exist "test-frontend-api.js" (
    del /f "test-frontend-api.js"
    echo [+] Removed test-frontend-api.js
)
if exist "test-json-extraction.js" (
    del /f "test-json-extraction.js"
    echo [+] Removed test-json-extraction.js
)
if exist "test-tee-backend.js" (
    del /f "test-tee-backend.js"
    echo [+] Removed test-tee-backend.js
)
if exist "tee-response.json" (
    del /f "tee-response.json"
    echo [+] Removed tee-response.json
)
if exist "$null" (
    del /f "$null"
    echo [+] Removed $null file
)

echo.
echo ========================================
echo [*] Archiving Old Documentation
echo ========================================
echo.

REM Create archive directory
if not exist "docs\archive" mkdir "docs\archive"

REM Move screenshots to archive
if exist "docs\screenshots" (
    move "docs\screenshots" "docs\archive\"
    echo [+] Moved docs\screenshots to archive
)

REM Move assets to archive
if exist "docs\assets" (
    move "docs\assets" "docs\archive\"
    echo [+] Moved docs\assets to archive
)

REM Archive old status documents
if exist "docs\STATUS.md" (
    move "docs\STATUS.md" "docs\archive\"
    echo [+] Archived docs\STATUS.md
)
if exist "docs\REPOSITORY_CLEANUP_GUIDE.md" (
    move "docs\REPOSITORY_CLEANUP_GUIDE.md" "docs\archive\"
    echo [+] Archived docs\REPOSITORY_CLEANUP_GUIDE.md
)

echo.
echo ========================================
echo [*] Organizing App Documentation
echo ========================================
echo.

REM Create app docs directories
if not exist "apps\web\docs" mkdir "apps\web\docs"
if not exist "apps\tee\docs" mkdir "apps\tee\docs"

REM Move app-specific docs
if exist "apps\web\README.md" (
    copy "apps\web\README.md" "apps\web\docs\"
    echo [+] Copied apps\web\README.md to apps\web\docs\
)
if exist "apps\web\CONTRIBUTING.md" (
    copy "apps\web\CONTRIBUTING.md" "apps\web\docs\"
    echo [+] Copied apps\web\CONTRIBUTING.md to apps\web\docs\
)
if exist "apps\web\SECURITY.md" (
    copy "apps\web\SECURITY.md" "apps\web\docs\"
    echo [+] Copied apps\web\SECURITY.md to apps\web\docs\
)
if exist "apps\tee\README.md" (
    copy "apps\tee\README.md" "apps\tee\docs\"
    echo [+] Copied apps\tee\README.md to apps\tee\docs\
)
if exist "apps\tee\CONTRIBUTING.md" (
    copy "apps\tee\CONTRIBUTING.md" "apps\tee\docs\"
    echo [+] Copied apps\tee\CONTRIBUTING.md to apps\tee\docs\
)

echo.
echo ========================================
echo [*] Cleaning Build Artifacts
echo ========================================
echo.

REM Clean Next.js build
if exist ".next" (
    rmdir /s /q ".next"
    echo [+] Cleaned .next directory
)

REM Clean TEE build
if exist "apps\tee\dist" (
    rmdir /s /q "apps\tee\dist"
    echo [+] Cleaned apps\tee\dist directory
)

REM Clean contract artifacts
if exist "packages\contracts\cache" (
    rmdir /s /q "packages\contracts\cache"
    echo [+] Cleaned packages\contracts\cache
)
if exist "packages\contracts\out" (
    rmdir /s /q "packages\contracts\out"
    echo [+] Cleaned packages\contracts\out
)

echo.
echo ========================================
echo [*] Verifying .gitignore
echo ========================================
echo.

if exist ".gitignore" (
    echo [+] .gitignore exists
    
    findstr /B "^\.env$" .gitignore >nul 2>nul
    if !errorlevel! equ 0 (
        echo [+] .env is properly ignored
    ) else (
        echo [!] .env might not be properly ignored
    )
    
    findstr "node_modules" .gitignore >nul 2>nul
    if !errorlevel! equ 0 (
        echo [+] node_modules is properly ignored
    ) else (
        echo [X] node_modules is not ignored!
    )
) else (
    echo [X] .gitignore not found!
)

echo.
echo ========================================
echo [*] Checking for Unintended Files
echo ========================================
echo.

set FOUND_ISSUES=0

if exist ".env.local" (
    echo [!] Found .env.local (should be in .gitignore)
    set FOUND_ISSUES=1
)
if exist ".env.development.local" (
    echo [!] Found .env.development.local (should be in .gitignore)
    set FOUND_ISSUES=1
)
if exist ".env.test.local" (
    echo [!] Found .env.test.local (should be in .gitignore)
    set FOUND_ISSUES=1
)
if exist ".env.production.local" (
    echo [!] Found .env.production.local (should be in .gitignore)
    set FOUND_ISSUES=1
)

if !FOUND_ISSUES! equ 0 (
    echo [+] No unintended files found
)

echo.
echo ========================================
echo [*] Git Status
echo ========================================
echo.

git status --short

echo.
echo [+] Git status check complete

echo.
echo ========================================
echo [+] Git Preparation Complete
echo ========================================
echo.
echo Repository is ready for commit!
echo.
echo Next steps:
echo 1. Review the changes: git status
echo 2. Stage changes: git add .
echo 3. Commit: git commit -m "chore: prepare for production release"
echo 4. Push: git push origin main
echo.
echo See docs\GITHUB_RELEASE_GUIDE.md for release instructions
echo.

endlocal
