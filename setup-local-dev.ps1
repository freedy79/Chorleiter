# Local Development Setup Script
# This script automates: database creation, restore, .env configuration, and server startup

param(
    [Parameter(HelpMessage = "PostgreSQL password for postgres user")]
    [string]$PostgresPassword = "postgres",

    [Parameter(HelpMessage = "Path to backup file to restore")]
    [string]$BackupFile,

    [Parameter(HelpMessage = "Skip npm install")]
    [switch]$SkipInstall,

    [Parameter(HelpMessage = "Show help")]
    [switch]$Help
)

if ($Help) {
    Write-Host @"
Local Development Setup Script

Usage:
  .\setup-local-dev.ps1 -PostgresPassword "your-password" -BackupFile ".\backups\backup-2026-02-14.sql"

Parameters:
  -PostgresPassword    Password for postgres user (default: postgres)
  -BackupFile         Path to SQL backup file to restore (optional)
  -SkipInstall        Skip npm install steps
  -Help               Show this help message

Examples:
  # Interactive (prompts for password)
  .\setup-local-dev.ps1

  # Automated with password and backup
  .\setup-local-dev.ps1 -PostgresPassword "mypassword" -BackupFile ".\backups\backup-latest.sql"

  # Just create database, skip restore
  .\setup-local-dev.ps1 -PostgresPassword "mypassword"

"@
    exit
}

# Color helpers
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Err { Write-Host $args -ForegroundColor Red }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Warn { Write-Host $args -ForegroundColor Yellow }

Write-Info "=== Chorleiter Local Development Setup ==="
Write-Info ""

# Check prerequisites
Write-Info "Checking prerequisites..."

# Check PostgreSQL and start service if needed
Write-Info "Checking PostgreSQL service..."
$pgServices = @(Get-Service -Name "postgresql-x64-*" -ErrorAction SilentlyContinue)

if ($pgServices.Count -eq 0) {
    Write-Err "[-] PostgreSQL not found. Please install PostgreSQL 15+ first."
    Write-Info "  Download: https://www.postgresql.org/download/windows/"
    exit 1
}

# Start PostgreSQL services if not running
foreach ($svc in $pgServices) {
    if ($svc.Status -ne "Running") {
        Write-Info "Starting $($svc.DisplayName)..."
        try {
            Start-Service -Name $svc.Name
            Write-Success "[+] Started $($svc.DisplayName)"
        }
        catch {
            Write-Warn "[!] Could not auto-start $($svc.DisplayName) - trying to continue"
        }
    }
    else {
        Write-Success "[+] $($svc.DisplayName) is running"
    }
}

# Verify psql is accessible
$pgFound = $false
$psqlPath = $null

# Try psql directly first
try {
    $pgVersion = & psql --version 2>$null
    if ($?) {
        Write-Success "[+] PostgreSQL CLI available: $pgVersion"
        $pgFound = $true
    }
}
catch {
    # Continue to search
}

# If not found, search in common PostgreSQL installation directories
if (-not $pgFound) {
    Write-Info "Searching for PostgreSQL in C:\Program Files\..."
    $pgDirs = @(
        "C:\Program Files\PostgreSQL\18\bin",
        "C:\Program Files\PostgreSQL\17\bin",
        "C:\Program Files\PostgreSQL\16\bin",
        "C:\Program Files\PostgreSQL\15\bin"
    )

    foreach ($dir in $pgDirs) {
        $psqlFile = Join-Path $dir "psql.exe"
        if (Test-Path $psqlFile) {
            $psqlPath = $psqlFile
            Write-Success "[+] Found psql at: $psqlFile"
            # Add to PATH for this session
            $env:PATH = "$dir;$env:PATH"
            $pgFound = $true
            break
        }
    }
}

if (-not $pgFound) {
    Write-Err "[-] PostgreSQL CLI (psql) not found in PATH or standard installation directories."
    Write-Info "  Please add PostgreSQL bin directory to Windows PATH:"
    Write-Info "  1. Search 'Environment Variables' in Windows"
    Write-Info "  2. Add: C:\Program Files\PostgreSQL\18\bin"
    exit 1
}

# Check Node.js
try {
    $nodeVersion = & node --version 2>$null
    Write-Success "[+] Node.js found: $nodeVersion"
}
catch {
    Write-Err "[-] Node.js not found. Please install Node.js 20+ first."
    exit 1
}

Write-Info ""
Write-Info "=== Step 1: Create Local Database ==="

# Prompt for password if not provided
if (-not $PostgresPassword) {
    $PostgresPassword = Read-Host "Enter PostgreSQL postgres user password (default postgres)"
    if ($PostgresPassword -eq "") { $PostgresPassword = "postgres" }
}

# Detect DB_PORT from existing .env or auto-detect
$DbPort = "5432"
$envPath = ".\choir-app-backend\.env"
if (Test-Path $envPath) {
    $envContent = Get-Content $envPath -Raw
    if ($envContent -match "DB_PORT=(\d+)") {
        $DbPort = $matches[1]
        Write-Info "Using DB_PORT=$DbPort from .env"
    }
}

# Set environment variables for psql
$env:PGPASSWORD = $PostgresPassword

# Test connection
try {
    $testConnection = & psql -U postgres -h localhost -p $DbPort -c "SELECT 1;" 2>&1
    if ($?) {
        Write-Success "[+] Connected to PostgreSQL locally (port $DbPort)"
    }
}
catch {
    Write-Err "[-] Could not connect to PostgreSQL on port $DbPort. Check password and if PostgreSQL is running."
    exit 1
}

# Check if database exists
$dbExists = $false
try {
    $dbList = & psql -U postgres -h localhost -p $DbPort -lqt 2>&1 | Select-String "chorleiter_dev"
    if ($dbList) {
        $dbExists = $true
    }
}
catch {
    # Continue if error
}

if ($dbExists) {
    Write-Warn "[!] Database chorleiter_dev already exists"
    $dropDb = Read-Host "Drop existing database? (y/n)"
    if ($dropDb -eq "y") {
        try {
            & psql -U postgres -h localhost -p $DbPort -c "DROP DATABASE IF EXISTS chorleiter_dev;" 2>&1 | Out-Null
            Write-Success "[+] Dropped existing database"
        }
        catch {
            Write-Err "[-] Failed to drop database"
        }
    }
    else {
        Write-Info "Keeping existing database"
    }
}

# Create database
try {
    & psql -U postgres -h localhost -p $DbPort -c "CREATE DATABASE chorleiter_dev;" 2>&1 | Out-Null
    Write-Success "[+] Created database chorleiter_dev"
}
catch {
    Write-Err "[-] Failed to create database (may already exist)"
}

Write-Info ""
Write-Info "=== Step 2: Restore Database Backup ==="

# Find backup file if not provided
if (-not $BackupFile) {
    Write-Info "Looking for backup files in .\backups\..."
    $backups = @(Get-ChildItem ".\backups\backup-*.sql" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending)

    if ($backups.Count -gt 0) {
        Write-Info "Found $($backups.Count) backup file(s):"
        for ($i = 0; $i -lt [Math]::Min(5, $backups.Count); $i++) {
            Write-Info "  $($i + 1). $($backups[$i].Name)  ($('{0:G}' -f $backups[$i].LastWriteTime))"
        }

        $choice = Read-Host "Select backup to restore (1-$($backups.Count)) or press Enter to skip"
        if ($choice -and $choice -match '^\d+$' -and [int]$choice -ge 1 -and [int]$choice -le $backups.Count) {
            $BackupFile = $backups[[int]$choice - 1].FullName
        }
        else {
            Write-Warn "[!] Skipping database restore (will use empty schema)"
        }
    }
    else {
        Write-Warn "[!] No backup files found in .\backups\"
        Write-Info "To download from production server, use:"
        Write-Info "  scp user@server:/backups/backup-*.sql .\backups\"
    }
}

if ($BackupFile) {
    if (-not (Test-Path $BackupFile)) {
        Write-Err "[-] Backup file not found: $BackupFile"
        exit 1
    }

    try {
        Write-Info "Restoring from: $BackupFile"
        $output = & psql -U postgres -h localhost -p $DbPort -d chorleiter_dev -f $BackupFile 2>&1
        if ($?) {
            Write-Success "[+] Database restored successfully"
        }
        else {
            Write-Warn "[!] Restoration completed with messages (check for errors above)"
        }
    }
    catch {
        Write-Err "[-] Failed to restore database: $_"
        exit 1
    }
}

Write-Info ""
Write-Info "=== Step 3: Configure .env ==="

$envPath = ".\choir-app-backend\.env"
if (-not (Test-Path $envPath)) {
    Write-Err "[-] .env file not found at $envPath"
    exit 1
}

# Create backup of original .env
Copy-Item $envPath "$envPath.backup" -Force
Write-Success "[+] Created backup: .env.backup"

# Update .env with local development settings
$envContent = @"
ADDRESS=localhost
PORT=8088
DB_HOST=localhost
DB_PORT=$DbPort
DB_USER=postgres
DB_PASSWORD=$PostgresPassword
DB_NAME=chorleiter_dev
DB_DIALECT=postgresql

JWT_SECRET=dev-secret-key-change-in-production-at-least-32-chars
ENCRYPTION_KEY=5deb5961088073f849477f2b6a8168787d955ddc43b231650475b7b492cc344a

CORS_ORIGINS=http://localhost:4200

DEBUG_AUTH=false
DEBUG_CSRF=false

SMTP_HOST=localhost
SMTP_PORT=25
SMTP_USER=no-reply
SMTP_PASS=
EMAIL_FROM=test@localhost
SMTP_STARTTLS=false
RATE_LIMIT_MAX=200
"@

Set-Content -Path $envPath -Value $envContent
Write-Success "[+] Updated .env for local development"

Write-Info ""
Write-Info "=== Step 4: Install Dependencies ==="

if ($SkipInstall) {
    Write-Warn "[!] Skipping npm install"
}
else {
    Push-Location "choir-app-backend"
    Write-Info "Installing backend dependencies..."
    & npm install 2>&1 | Select-String -Pattern "added|up to date" | Select-Object -First 1
    if ($?) {
        Write-Success "[+] Backend dependencies installed"
    }
    else {
        Write-Warn "[!] npm install had issues - check output above"
    }
    Pop-Location

    Push-Location "choir-app-frontend"
    Write-Info "Installing frontend dependencies..."
    & npm install --force 2>&1 | Select-String -Pattern "added|up to date|audited" | Select-Object -First 1
    if ($?) {
        Write-Success "[+] Frontend dependencies installed"
    }
    else {
        Write-Warn "[!] npm install had issues - check output above"
    }
    Pop-Location
}

Write-Info ""
Write-Info "=== Setup Complete! ==="
Write-Success "[+] Local development environment ready"

Write-Info ""
Write-Info "Next steps:"
Write-Info ""
Write-Info "1. Start the backend (in one terminal):"
Write-Info "   cd choir-app-backend"
Write-Info "   npm run dev"
Write-Info ""
Write-Info "2. Start the frontend (in another terminal):"
Write-Info "   cd choir-app-frontend"
Write-Info "   npm run startwithtimestamp"
Write-Info ""
Write-Info "3. Open browser to http://localhost:4200"
Write-Info ""
Write-Warn "Database credentials for reference:"
Write-Warn "  Host: localhost"
Write-Warn "  Port: $DbPort"
Write-Warn "  User: postgres"
Write-Warn "  Password: (as entered above)"
Write-Warn "  Database: chorleiter_dev"
Write-Info ""
Write-Info "Documentation: see LOCAL-DEV-SETUP.md"

# Clear password from environment
$env:PGPASSWORD = ""

# Exit with success
exit 0
