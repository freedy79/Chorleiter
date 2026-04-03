<#
.SYNOPSIS
    Local pre-check script that mirrors the GitHub CI pipeline.
    Run this before creating a pull request to catch issues early.

.DESCRIPTION
    Executes the same checks as .github/workflows/ci.yml:
      1. Policy and Security Checks (dangerous DB patterns, hardcoded secrets, console.log)
      2. Backend Tests (Node.js tests with in-memory SQLite)
      3. Frontend Build (Angular production build)
      4. Frontend Tests (Karma + ChromeHeadless)

.PARAMETER SkipFrontendTests
    Skip the Angular Karma tests (they require Chrome). Build is still checked.

.PARAMETER SkipBackendTests
    Skip the backend Node.js tests.

.PARAMETER SkipPolicyChecks
    Skip the policy/security checks.

.PARAMETER BackendOnly
    Run only backend tests (skip all frontend steps).

.PARAMETER FrontendOnly
    Run only frontend steps (skip backend tests and policy checks on backend).

.EXAMPLE
    .\pre-check.ps1                  # Full check (all steps)
    .\pre-check.ps1 -BackendOnly     # Only backend tests
    .\pre-check.ps1 -SkipFrontendTests  # Policy + backend + frontend build (no Karma)
#>

param(
    [switch]$SkipFrontendTests,
    [switch]$SkipBackendTests,
    [switch]$SkipPolicyChecks,
    [switch]$BackendOnly,
    [switch]$FrontendOnly
)

$ErrorActionPreference = 'Continue'
$rootDir = $PSScriptRoot
$backendDir = Join-Path $rootDir 'choir-app-backend'
$frontendDir = Join-Path $rootDir 'choir-app-frontend'

# -- Helpers ----------------------------------------------------------------

$script:stepCount = 0
$script:passCount = 0
$script:failCount = 0
$script:warnCount = 0
$script:failures = @()
$startTime = Get-Date

function Write-Step($msg) {
    $script:stepCount++
    Write-Host ''
    Write-Host '------------------------------------------------------------' -ForegroundColor Cyan
    Write-Host "  [$script:stepCount] $msg" -ForegroundColor Cyan
    Write-Host '------------------------------------------------------------' -ForegroundColor Cyan
}

function Write-Pass($msg) {
    $script:passCount++
    Write-Host "  [PASS] $msg" -ForegroundColor Green
}

function Write-Fail($msg) {
    $script:failCount++
    $script:failures += $msg
    Write-Host "  [FAIL] $msg" -ForegroundColor Red
}

function Write-Warn($msg) {
    $script:warnCount++
    Write-Host "  [WARN] $msg" -ForegroundColor Yellow
}

function Write-Info($msg) {
    Write-Host "  $msg" -ForegroundColor Gray
}

# -- Banner -----------------------------------------------------------------

Write-Host ''
Write-Host '================================================================' -ForegroundColor Magenta
Write-Host '    Chorleiter - Local PR Pre-Check                             ' -ForegroundColor Magenta
Write-Host '    Mirrors .github/workflows/ci.yml                            ' -ForegroundColor Magenta
Write-Host '================================================================' -ForegroundColor Magenta

# ===========================================================================
# STEP 1: Policy and Security Checks
# ===========================================================================

if (-not $SkipPolicyChecks -and -not $FrontendOnly) {
    Write-Step 'Policy and Security Checks'

    # 1a. Dangerous database patterns
    Write-Info 'Checking for forbidden database patterns...'
    $dangerousSync = Get-ChildItem -Path "$backendDir\src" -Recurse -Include '*.js' |
        Select-String -Pattern 'sequelize\.sync.*alter.*true'
    if ($dangerousSync) {
        Write-Fail 'sequelize.sync({ alter: true }) found! See doc/backend/DATABASE-MIGRATION-RULES.md'
        $dangerousSync | ForEach-Object { Write-Host "    $($_.Path):$($_.LineNumber)" -ForegroundColor Red }
    } else {
        Write-Pass 'No dangerous sequelize.sync({ alter: true }) patterns'
    }

    $forceSyncOutsideInit = Get-ChildItem -Path "$backendDir\src" -Recurse -Include '*.js' |
        Where-Object { $_.FullName -notlike '*\init\*' } |
        Select-String -Pattern '\.sync\(\{.*force.*true'
    if ($forceSyncOutsideInit) {
        Write-Fail 'sync({ force: true }) found outside init/ directory!'
        $forceSyncOutsideInit | ForEach-Object { Write-Host "    $($_.Path):$($_.LineNumber)" -ForegroundColor Red }
    } else {
        Write-Pass 'No sync({ force: true }) outside init/'
    }

    # 1b. Hardcoded secrets (exclude template literals like ${dbConfig.PASSWORD})
    Write-Info 'Checking for hardcoded secrets...'
    $secretPattern = "(password|secret|api[_\-]?key|token)\s*=\s*['\`"][^'\`"\$]{8,}"
    $secretMatches = Get-ChildItem -Path "$backendDir\src", "$frontendDir\src" -Recurse -Include '*.js','*.ts' |
        Where-Object { $_.FullName -notlike '*\tests\*' -and $_.FullName -notlike '*\node_modules\*' -and
                       $_.Name -notlike '*.test.js' -and $_.Name -notlike '*.spec.ts' -and
                       $_.Name -notlike '*.d.ts' } |
        Select-String -Pattern $secretPattern
    if ($secretMatches) {
        Write-Fail 'Potential hardcoded secrets detected!'
        $secretMatches | ForEach-Object { Write-Host "    $($_.Path):$($_.LineNumber): $($_.Line.Trim())" -ForegroundColor Red }
    } else {
        Write-Pass 'No hardcoded secrets detected'
    }

    # 1c. console.log in frontend production code
    Write-Info 'Checking for console.log in frontend production code...'
    $consoleLogs = Get-ChildItem -Path "$frontendDir\src\app" -Recurse -Include '*.ts' |
        Where-Object { $_.Name -notlike '*.spec.ts' } |
        Select-String -Pattern 'console\.log'
    if ($consoleLogs) {
        $logCount = ($consoleLogs | Measure-Object).Count
        Write-Warn "console.log found in production code ($logCount occurrences)"
        $consoleLogs | Select-Object -First 5 | ForEach-Object {
            $leaf = Split-Path $_.Path -Leaf
            Write-Host "    ${leaf}:$($_.LineNumber)" -ForegroundColor Yellow
        }
    } else {
        Write-Pass 'No console.log in production code'
    }
}

# ===========================================================================
# STEP 2: Backend Tests
# ===========================================================================

if (-not $SkipBackendTests -and -not $FrontendOnly) {
    Write-Step 'Backend Tests'
    Write-Info 'Running backend test suite (in-memory SQLite)...'

    Push-Location $backendDir
    try {
        $backendOutput = npm test 2>&1 | Out-String
        $backendExit = $LASTEXITCODE

        # Save output for reference
        $backendOutput | Out-File -FilePath (Join-Path $backendDir 'test-output.txt') -Encoding utf8

        if ($backendExit -eq 0) {
            # Count individual test file pass lines (format: "xxx tests passed")
            $passLines = ($backendOutput -split "`n" | Where-Object { $_ -match 'tests passed' } | Measure-Object).Count
            Write-Pass "Backend tests passed ($passLines test files)"
        } else {
            Write-Fail "Backend tests FAILED (exit code: $backendExit)"
            $lines = $backendOutput -split "`n"

            # Extract the failing test file and assertion errors
            $currentFile = ''
            $inError = $false
            $errorLines = @()
            foreach ($line in $lines) {
                # Detect which test file is running ("Running tests/xxx.test.js")
                if ($line -match 'Running\s+(tests[/\\]\S+)') {
                    $currentFile = $Matches[1]
                }
                # Detect assertion/error start
                if ($line -match 'AssertionError|AssertError|Error:|FAIL|assert\.strictEqual|expected.*to|assert\(' -and $line -notmatch '^\s*at\s') {
                    if ($currentFile -and -not $inError) {
                        $errorLines += "  File: $currentFile"
                    }
                    $inError = $true
                    $errorLines += $line
                }
                # Capture stack trace lines with file:line info
                elseif ($inError -and $line -match '^\s+at\s') {
                    if ($line -match '(tests[/\\][^:]+):(\d+)') {
                        $errorLines += $line
                    }
                }
                elseif ($inError -and $line -notmatch '^\s+at\s' -and $line.Trim() -ne '') {
                    $inError = $false
                }
            }

            if ($errorLines.Count -gt 0) {
                Write-Host '' -ForegroundColor Red
                Write-Host '  Error details:' -ForegroundColor Red
                $errorLines | Select-Object -First 30 | ForEach-Object {
                    Write-Host "    $_" -ForegroundColor Red
                }
            } else {
                # Fallback: show last 15 lines
                Write-Host '' -ForegroundColor Red
                $lines | Select-Object -Last 15 | ForEach-Object { Write-Host "    $_" -ForegroundColor Red }
            }
        }
    } finally {
        Pop-Location
    }
}

# ===========================================================================
# STEP 3: Frontend Build
# ===========================================================================

if (-not $BackendOnly) {
    Write-Step 'Frontend Build'
    Write-Info 'Building Angular app (production)...'

    Push-Location $frontendDir
    try {
        $buildOutput = npx ng build 2>&1 | Out-String
        $buildExit = $LASTEXITCODE

        if ($buildExit -eq 0) {
            # Check for warnings
            $warningCount = ([regex]::Matches($buildOutput, 'WARNING')).Count
            if ($warningCount -gt 0) {
                Write-Pass "Frontend build succeeded with $warningCount warning(s)"
            } else {
                Write-Pass 'Frontend build succeeded (no warnings)'
            }
        } else {
            Write-Fail 'Frontend build FAILED'
            $lines = $buildOutput -split "`n"
            $lines | Where-Object { $_ -match 'ERROR|Error' } | Select-Object -First 10 |
                ForEach-Object { Write-Host "    $_" -ForegroundColor Red }
        }
    } finally {
        Pop-Location
    }
}

# ===========================================================================
# STEP 4: Frontend Tests
# ===========================================================================

if (-not $SkipFrontendTests -and -not $BackendOnly) {
    Write-Step 'Frontend Tests (Karma + ChromeHeadless)'
    Write-Info 'Running Angular test suite...'

    Push-Location $frontendDir
    try {
        $testOutput = npx ng test --watch=false --progress=false --browsers=ChromeHeadless 2>&1 | Out-String
        $testExit = $LASTEXITCODE

        if ($testExit -eq 0) {
            $executedMatch = [regex]::Match($testOutput, 'Executed (\d+) of (\d+)')
            if ($executedMatch.Success) {
                $ran = $executedMatch.Groups[1].Value
                $total = $executedMatch.Groups[2].Value
                Write-Pass "Frontend tests passed ($ran of $total executed)"
            } else {
                Write-Pass 'Frontend tests passed'
            }
        } else {
            $failMatch = [regex]::Match($testOutput, 'Executed \d+ of \d+ \((\d+) FAILED\)')
            if ($failMatch.Success) {
                Write-Fail "Frontend tests: $($failMatch.Groups[1].Value) test(s) FAILED"
            } else {
                Write-Fail "Frontend tests FAILED (exit code: $testExit)"
            }

            # Extract failing test details from Karma output
            $testLines = $testOutput -split "`n"
            $failedTests = @()
            $currentSuite = ''
            $capture = $false
            $captureBuffer = @()

            foreach ($line in $testLines) {
                # Karma FAILED line: "Chrome Headless ... SuiteName TestName FAILED"
                if ($line -match 'FAILED\s*$') {
                    if ($captureBuffer.Count -gt 0) {
                        $failedTests += $captureBuffer
                        $captureBuffer = @()
                    }
                    $testName = $line -replace '^\s*Chrome[^:]*:\s*', '' -replace '\s*FAILED\s*$', ''
                    $captureBuffer += "  FAILED: $testName"
                    $capture = $true
                }
                # Capture indented error details (expectations, stack traces)
                elseif ($capture -and $line -match '^\s{4,}') {
                    $trimmed = $line.TrimEnd()
                    # Include error messages and file:line references
                    if ($trimmed -match 'Expected|Error|at\s.*\.spec\.ts:\d+|TypeError|Cannot read') {
                        $captureBuffer += "    $($trimmed.TrimStart())"
                    }
                }
                # End capture on non-indented non-empty line
                elseif ($capture -and $line.Trim() -ne '' -and $line -notmatch '^\s{4,}') {
                    $capture = $false
                }
            }
            # Flush last buffer
            if ($captureBuffer.Count -gt 0) {
                $failedTests += $captureBuffer
            }

            if ($failedTests.Count -gt 0) {
                Write-Host '' -ForegroundColor Red
                Write-Host '  Failing test details:' -ForegroundColor Red
                $failedTests | Select-Object -First 50 | ForEach-Object {
                    if ($_ -match '^  FAILED:') {
                        Write-Host "    $_" -ForegroundColor Red
                    } else {
                        Write-Host "    $_" -ForegroundColor DarkRed
                    }
                }
            } else {
                # Fallback: show lines matching FAILED or Error
                $testOutput -split "`n" | Where-Object { $_ -match 'FAILED|Error' } |
                    Select-Object -First 10 |
                    ForEach-Object { Write-Host "    $_" -ForegroundColor Red }
            }
        }
    } finally {
        Pop-Location
    }
}

# ===========================================================================
# Summary
# ===========================================================================

$elapsed = (Get-Date) - $startTime
$elapsedStr = '{0:mm}:{0:ss}' -f $elapsed

Write-Host ''
Write-Host '================================================================' -ForegroundColor Magenta
Write-Host "  SUMMARY  ($elapsedStr elapsed)" -ForegroundColor Magenta
Write-Host '================================================================' -ForegroundColor Magenta
Write-Host "  Passed:   $script:passCount" -ForegroundColor Green
if ($script:warnCount -gt 0) {
    Write-Host "  Warnings: $script:warnCount" -ForegroundColor Yellow
}
if ($script:failCount -gt 0) {
    Write-Host "  Failed:   $script:failCount" -ForegroundColor Red
    Write-Host ''
    Write-Host '  Failures:' -ForegroundColor Red
    $script:failures | ForEach-Object { Write-Host "    - $_" -ForegroundColor Red }
}
Write-Host '================================================================' -ForegroundColor Magenta

if ($script:failCount -gt 0) {
    Write-Host ''
    Write-Host '  PR pre-check FAILED - fix the issues above before pushing.' -ForegroundColor Red
    Write-Host ''
    exit 1
} else {
    Write-Host ''
    Write-Host '  PR pre-check PASSED - ready to push!' -ForegroundColor Green
    Write-Host ''
    exit 0
}
