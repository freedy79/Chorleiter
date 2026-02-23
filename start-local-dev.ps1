# Local Development Start Script
# Checks configuration and starts backend + frontend
# Runs setup script if anything is misconfigured

param(
    [Parameter(HelpMessage = "PostgreSQL password for postgres user")]
    [string]$PostgresPassword = "postgres",

    [Parameter(HelpMessage = "Show help")]
    [switch]$Help
)

if ($Help) {
    Write-Host @"
Local Development Start Script

Usage:
  .\start-local-dev.ps1

Options:
  -PostgresPassword    Password for postgres user (default: postgres)
  -Help               Show this help message

This script:
  1. Checks PostgreSQL is running
  2. Verifies database and .env configuration
  3. Runs setup script if anything is wrong
  4. Starts backend in one terminal
  5. Starts frontend in another terminal

"@
    exit
}

# Color helpers
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Err { Write-Host $args -ForegroundColor Red }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Warn { Write-Host $args -ForegroundColor Yellow }

Write-Info "=== Chorleiter Local Development Start ==="
Write-Info ""

$needsSetup = $false
$setupReason = ""

# Check 1: PostgreSQL Service
Write-Info "Checking PostgreSQL service..."
$pgServices = @(Get-Service -Name "postgresql-x64-*" -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq "Running" })

if ($pgServices.Count -eq 0) {
    Write-Warn "[!] PostgreSQL service not running"
    Write-Info "Attempting to start PostgreSQL..."
    $allPgServices = @(Get-Service -Name "postgresql-x64-*" -ErrorAction SilentlyContinue)
    foreach ($svc in $allPgServices) {
        try {
            Start-Service -Name $svc.Name 2>$null
            Write-Success "[+] Started $($svc.DisplayName)"
        }
        catch {
            Write-Warn "[!] Could not start $($svc.DisplayName)"
            $needsSetup = $true
            $setupReason = "PostgreSQL service could not be started"
        }
    }
}
else {
    Write-Success "[+] PostgreSQL running: $($pgServices[0].DisplayName)"
}

# Check 2: psql in PATH
Write-Info "Checking psql availability..."
$psqlFound = $false
try {
    $pgVersion = & psql --version 2>$null
    if ($?) {
        Write-Success "[+] psql available: $pgVersion"
        $psqlFound = $true
    }
}
catch {
    # Try to find it
    $psqlPath = $null
    $pgDirs = @(
        "C:\Program Files\PostgreSQL\18\bin",
        "C:\Program Files\PostgreSQL\17\bin",
        "C:\Program Files\PostgreSQL\16\bin"
    )

    foreach ($dir in $pgDirs) {
        $psqlFile = Join-Path $dir "psql.exe"
        if (Test-Path $psqlFile) {
            $env:PATH = "$dir;$env:PATH"
            $psqlFound = $true
            Write-Success "[+] Found and added to PATH: $dir"
            break
        }
    }
}

if (-not $psqlFound) {
    Write-Warn "[!] psql not found"
    $needsSetup = $true
    $setupReason = "psql not found in PATH"
}

# Check 3: .env configuration
Write-Info "Checking .env configuration..."
$envPath = ".\choir-app-backend\.env"

if (-not (Test-Path $envPath)) {
    Write-Warn "[!] .env file not found"
    $needsSetup = $true
    $setupReason = ".env not configured"
}
else {
    $envContent = Get-Content $envPath -Raw
    $isConfigured = $false

    if ($envContent -match "DB_DIALECT=postgresql") {
        if ($envContent -match "DB_HOST=localhost") {
            Write-Success "[+] .env configured for PostgreSQL"
            $isConfigured = $true
        }
    }

    if (-not $isConfigured) {
        Write-Warn "[!] .env not configured for local PostgreSQL"
        $setupReason = ".env not configured for local development"
        $needsSetup = $true
    }
}

# Check 4: Test database connection using .env credentials
if ($psqlFound -and -not $needsSetup) {
    Write-Info "Testing PostgreSQL connection with .env credentials..."

    # Extract DB credentials from .env
    $envContent = Get-Content $envPath -Raw
    $dbHost = if ($envContent -match "DB_HOST=([^\r\n]+)") { $matches[1] } else { "localhost" }
    $dbPort = if ($envContent -match "DB_PORT=([^\r\n]+)") { $matches[1] } else { "5432" }
    $dbUser = if ($envContent -match "DB_USER=([^\r\n]+)") { $matches[1] } else { "postgres" }
    $dbPassword = if ($envContent -match "DB_PASSWORD=([^\r\n]+)") { $matches[1] } else { "" }
    $dbName = if ($envContent -match "DB_NAME=([^\r\n]+)") { $matches[1] } else { "chorleiter_dev" }

    $env:PGPASSWORD = $dbPassword

    try {
        $testConn = & psql -U $dbUser -h $dbHost -p $dbPort -d $dbName -c "SELECT 1;" 2>&1
        if ($?) {
            Write-Success "[+] PostgreSQL connection successful (${dbHost}:${dbPort})"
        }
        else {
            Write-Err "[-] PostgreSQL connection failed"
            Write-Err "    User: $dbUser @ ${dbHost}:${dbPort}"
            Write-Err "    Database: $dbName"
            Write-Err "    Error: $testConn"
            $needsSetup = $true
            $setupReason = "PostgreSQL connection failed (wrong password or database not accessible)"
        }
    }
    catch {
        Write-Err "[-] PostgreSQL connection test error: $_"
        $needsSetup = $true
        $setupReason = "PostgreSQL error: $_"
    }
}

# Check 5: Database exists
if ($psqlFound) {
    Write-Info "Checking database..."
    $env:PGPASSWORD = $dbPassword

    try {
        $dbCheck = & psql -U $dbUser -h $dbHost -p $dbPort -lqt 2>&1 | Select-String "chorleiter_dev"
        if ($dbCheck) {
            Write-Success "[+] Database chorleiter_dev exists"
        }
        else {
            Write-Warn "[!] Database chorleiter_dev not found"
            $needsSetup = $true
            $setupReason = "Database not found or not accessible"
        }
    }
    catch {
        Write-Warn "[!] Could not connect to database"
        $needsSetup = $true
        $setupReason = "Could not connect to PostgreSQL (wrong password?)"
    }
}


if (-not (Test-Path ".\choir-app-backend\node_modules")) {
    Write-Warn "[!] Backend dependencies not installed"
    $needsSetup = $true
    $setupReason = "Missing npm dependencies"
}
else {
    Write-Success "[+] Backend dependencies present"
}

if (-not (Test-Path ".\choir-app-frontend\node_modules")) {
    Write-Warn "[!] Frontend dependencies not installed"
    $needsSetup = $true
    $setupReason = "Missing npm dependencies (run setup to fix)"
}
else {
    Write-Success "[+] Frontend dependencies present"
}

Write-Info ""

# If anything is wrong, run setup script
if ($needsSetup) {
    Write-Warn "[!] Configuration issue detected: $setupReason"
    Write-Info ""
    Write-Info "Running setup script..."
    Write-Info ""

    & .\setup-local-dev.ps1 -PostgresPassword $PostgresPassword

    if ($LASTEXITCODE -ne 0) {
        Write-Err "[-] Setup script failed"
        exit 1
    }

    Write-Success "[+] Setup completed successfully"
    Write-Info ""
}

# All checks passed, start services
Write-Info "=== Starting Local Services ==="
Write-Info ""

# Ensure Node.js tools are available
if (-not ($env:PATH -match "nodejs")) {
    $env:PATH = "C:\Program Files\nodejs;$env:PATH"
}

Write-Info "Backend will start in 3 seconds..."
Start-Sleep -Seconds 3

Write-Info "Starting backend..."
$backendCmd = "cd '$(Get-Location)\choir-app-backend'; `$env:PATH = 'C:\Program Files\nodejs;' + `$env:PATH; npm run dev; Read-Host 'Press Enter to exit'"
$backendProcess = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", $backendCmd -PassThru
Write-Success "[+] Backend started (PID: $($backendProcess.Id))"

Write-Info ""
Write-Info "Starting frontend..."
Start-Sleep -Seconds 2
$frontendCmd = "cd '$(Get-Location)\choir-app-frontend'; `$env:PATH = 'C:\Program Files\nodejs;' + `$env:PATH; npm run startwithtimestamp; Read-Host 'Press Enter to exit'"
$frontendProcess = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", $frontendCmd -PassThru
Write-Success "[+] Frontend started (PID: $($frontendProcess.Id))"

Write-Info ""
Write-Success "[+] Services started successfully!"
Write-Info ""
Write-Info "Backend:  http://localhost:8088"
Write-Info "Frontend: http://localhost:4200"
Write-Info ""
Write-Info "Browser should open automatically for frontend."
Write-Info "Check the opened terminals for any errors."
Write-Info ""
Write-Warn "To stop services: Close the terminal windows or press Ctrl+C"
