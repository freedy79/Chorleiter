param(
    [switch]$Verbose,
    [switch]$Frontend,
    [switch]$Backend,
    [switch]$Upload
)

# Determine what to build (default: all)
$buildFrontend = $Frontend.IsPresent
$buildBackend = $Backend.IsPresent
$uploadOnly = $Upload.IsPresent

# If no specific flags provided, build everything
if (-not $buildFrontend -and -not $buildBackend -and -not $uploadOnly) {
    $buildFrontend = $true
    $buildBackend = $true
    $uploadOnly = $true
}

$ErrorActionPreference = 'Stop'
$VerboseLogging = $Verbose.IsPresent

if ($VerboseLogging) {
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Starting deployment script in verbose mode"
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Options: Frontend=$buildFrontend Backend=$buildBackend Upload=$uploadOnly"
} else {
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Starting deployment script"
}

# UTF-8 Konsolen-Encoding für korrekte Linux-Ausgabe
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

function Write-VerboseLog {
    param(
        [string]$Message
    )

    if ($VerboseLogging) {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $Message"
    }
}

$PasswordFile = "$env:USERPROFILE\.chorleiter_deploy_pw"
$RemoteUser = "root"
$RemoteHost = "88.222.220.28"
$Remote = "$RemoteUser@$RemoteHost"
$BackendDest = "/usr/local/lsws/ChorStatistik/backend"
$FrontendDest = "/usr/local/lsws/ChorStatistik/html"

$script:DeployFailed = $false

try {
if ($buildFrontend -or $buildBackend) {
    # Ensure remote repository is up to date
    Write-Host "Checking git status..."
    git fetch | Out-Null
    $status = git status -uno

    # Only ask to pull if remote is ahead, ignore local changes
    if ($status -match 'behind') {
        $update = Read-Host "Remote repository is ahead. Pull latest changes before deploying? (y/N)"
        if ($update -match '^[Yy]') {
            git pull --rebase
        } else {
            Write-Host "Continuing with current repository state."
        }
    } else {
        Write-Host "Local repository is up to date with remote."
    }
}

if ($buildFrontend) {
    # Build Angular frontend
    Write-Host "Building Angular frontend..."
    npm --prefix choir-app-frontend run build
    if ($LASTEXITCODE -ne 0) {
        throw "Build failed. Aborting deployment."
    }

    Write-Host "Build finished."
}

if ($buildBackend) {
    # Verify backend can start by syntax checking server.js
    npm --prefix choir-app-backend run check
}

# Determine authentication method
$sshUseAgent = $false
$sshUsePlink = $false

if ($uploadOnly) {
    if (Get-Command ssh-add -ErrorAction SilentlyContinue) {
        try {
            $keys = ssh-add -L 2>$null
            if ($LASTEXITCODE -eq 0 -and $keys) {
                $sshUseAgent = $true
                Write-Host "Using ssh-agent for authentication."
            }
        } catch {
            # ignore errors from ssh-add
        }
    }

if (-not $sshUseAgent) {
    if (Get-Command plink -ErrorAction SilentlyContinue) {
        $sshUsePlink = $true
        Write-Host "Using plink/pscp for authentication."
    }
}

if ($sshUseAgent) {
    Write-Host "Verifying ssh-agent access..."
    & ssh -o BatchMode=yes -o StrictHostKeyChecking=no $Remote exit 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ssh-agent authentication failed, falling back to password." -ForegroundColor Yellow
        $sshUseAgent = $false
        if (Get-Command plink -ErrorAction SilentlyContinue) {
            $sshUsePlink = $true
            Write-Host "Using plink/pscp for authentication."
        }
    }
}

if (-not $sshUseAgent -and -not $sshUsePlink) {
    Write-Host "plink not found and no ssh-agent keys loaded. You will be prompted for the password." -ForegroundColor Yellow
}


$Password = $null
if (-not $sshUseAgent) {
    if (Test-Path $PasswordFile) {
        $Password = (Get-Content $PasswordFile -Raw).Trim()
        if ($Password) {
            Write-Host "Using password from $PasswordFile."
        }
    } else {
        $create = Read-Host "Password file $PasswordFile not found. Create it? (y/N)"
        if ($create -match '^[Yy]') {
            $Password = Read-Host "SSH password for $Remote"
            Set-Content -Path $PasswordFile -Value $Password
        }
    }
    if (-not $Password) {
        $Password = Read-Host "SSH password for $Remote"
    }
}

$sshUseSshpass = $false
if (Get-Command sshpass -ErrorAction SilentlyContinue) {
    $sshUseSshpass = $true
}

function Invoke-Ssh {
    param(
        [string]$Command
    )

    if ($sshUsePlink) {
        $plinkArgs = @()
        if ($VerboseLogging) {
            $plinkArgs += '-v'
        }
        $plinkArgs += @('-batch', '-l', $RemoteUser, '-pw', "$Password", $RemoteHost, $Command)
        & plink @plinkArgs
    }
    else {
        $sshArgs = @()
        if ($VerboseLogging) {
            $sshArgs += '-v'
        }
        $sshArgs += @($Remote, $Command)
        & ssh @sshArgs
    }
}

function Invoke-Scp {
    param(
        [string]$Source,
        [string]$Destination
    )

    if ($sshUsePlink) {
        $pscpArgs = @()
        if ($VerboseLogging) {
            $pscpArgs += '-v'
        }
        $pscpArgs += @('-batch', '-l', $RemoteUser, '-pw', "$Password", $Source, $Destination)
        & pscp @pscpArgs
    }
    else {
        $scpArgs = @()
        if ($VerboseLogging) {
            $scpArgs += '-v'
        }
        $scpArgs += @($Source, $Destination)
        & scp @scpArgs
    }
}

# Ensure we're in the root directory for tar operations
Push-Location $PSScriptRoot

Write-Host "Requesting temporary files for packaging..."
$BackendArchive = [IO.Path]::GetFullPath([IO.Path]::GetTempFileName() + ".tar.gz")
$FrontendArchive = [IO.Path]::GetFullPath([IO.Path]::GetTempFileName() + ".tar.gz")

Write-VerboseLog "Backend archive path: $BackendArchive"
Write-VerboseLog "Frontend archive path: $FrontendArchive"

# Pack directories
Write-Host "Compressing now..."

# Convert relative paths to absolute for tar
$BackendSourcePath = Join-Path $PSScriptRoot "choir-app-backend"
$FrontendSourcePath = Join-Path $PSScriptRoot "choir-app-frontend/dist/choir-app-frontend/browser"

Write-VerboseLog "Backend source: $BackendSourcePath"
Write-VerboseLog "Frontend source: $FrontendSourcePath"

# Verify directories exist
if (-not (Test-Path $BackendSourcePath)) {
    throw "Backend directory not found: $BackendSourcePath"
}
if (-not (Test-Path $FrontendSourcePath)) {
    throw "Frontend directory not found: $FrontendSourcePath"
}

Write-VerboseLog "Compressing backend (excluding node_modules, logs, uploads)..."
$tarArgs = @('--exclude=.env', '--exclude=node_modules', '--exclude=logs', '--exclude=uploads', '-czf', $BackendArchive, '-C', $BackendSourcePath, '.')
& tar $tarArgs
if ($LASTEXITCODE -ne 0) {
    throw "Backend compression failed with exit code $LASTEXITCODE. Command: tar $($tarArgs -join ' ')"
}
Write-Host "Backend compressed successfully."

Write-VerboseLog "Compressing frontend..."
$tarArgs = @('-czf', $FrontendArchive, '-C', $FrontendSourcePath, '.')
& tar $tarArgs
if ($LASTEXITCODE -ne 0) {
    throw "Frontend compression failed with exit code $LASTEXITCODE. Command: tar $($tarArgs -join ' ')"
}
Write-Host "Frontend compressed successfully."

Write-Host "Compression finished. Starting deployment..."

# Create remote directories
Write-VerboseLog "Creating remote directories..."
Invoke-Ssh "mkdir -p '$BackendDest' '$FrontendDest'"
Write-VerboseLog "Remote directories created."

# Remove existing frontend files before uploading new ones
Write-Host "Removing old frontend files..."
Invoke-Ssh "rm -rf '$FrontendDest'/*"
Write-VerboseLog "Old files removed."

# Upload archives
Write-Host "Uploading backend archive..."
Invoke-Scp $BackendArchive "${Remote}:/tmp/backend.tar.gz"
Write-VerboseLog "Backend archive uploaded."

Write-Host "Uploading frontend archive..."
Invoke-Scp $FrontendArchive "${Remote}:/tmp/frontend.tar.gz"
Write-VerboseLog "Frontend archive uploaded."

# Extract archives on server and clean up
Write-Host "Extracting backend on server..."
Invoke-Ssh "tar -xzf /tmp/backend.tar.gz -C '$BackendDest'; rm /tmp/backend.tar.gz"
Write-VerboseLog "Backend extracted."

Write-Host "Extracting frontend on server..."
Invoke-Ssh "tar -xzf /tmp/frontend.tar.gz -C '$FrontendDest'; rm /tmp/frontend.tar.gz"
Write-VerboseLog "Frontend extracted."

# Create database backup
Write-Host "Creating database backup on server..."
Invoke-Ssh "cd '$BackendDest' && npm run backup"
Write-VerboseLog "Database backup completed."

# Ensure backend dependencies are installed
Write-Host "Installing backend dependencies..."
$installResult = Invoke-Ssh "cd '$BackendDest' && npm install 2>&1; echo EXIT_CODE:`$?"
Write-VerboseLog "npm install output: $installResult"
# Extract exit code from last line
$exitCodeLine = ($installResult -split "`n")[-1]
if ($exitCodeLine -notmatch 'EXIT_CODE:0$') {
    Write-Host "npm install failed on server!" -ForegroundColor Red
    Write-Host $installResult
    throw "npm install failed"
}
Write-VerboseLog "Dependencies installed."

# Archive old logs
Write-Host "Archiving old logs..."
$archiveResult = Invoke-Ssh "cd '$BackendDest' && npm run archive-logs 2>&1"
Write-VerboseLog "Archive logs output: $archiveResult"

# Restart backend
Write-Host "Restarting backend service..."
Invoke-Ssh "pm2 restart chorleiter-api"
Write-VerboseLog "Backend restart command sent."

Write-Host "Waiting 10 seconds for backend to start..."
Start-Sleep -Seconds 10

# Verify backend started
Write-Host "Checking PM2 status..."
$pm2Status = Invoke-Ssh "pm2 describe chorleiter-api | grep -i status" 2>$null
if ($pm2Status -notmatch 'online') {
    Write-Host "Backend process failed to start. Recent log output:" -ForegroundColor Red
    Write-Host "=== PM2 Logs ===" -ForegroundColor Yellow
    Invoke-Ssh "pm2 logs chorleiter-api --lines 30 --nostream 2>/dev/null || echo 'No PM2 logs available'"
    Write-Host "=== Exception Log ===" -ForegroundColor Yellow
    Invoke-Ssh "tail -n 20 '$BackendDest/logs/exceptions.log' 2>/dev/null || echo 'No exceptions log found'"
    Remove-Item $BackendArchive
    Remove-Item $FrontendArchive
    throw "Backend failed to start."
}

# Verify HTTP endpoint is responding
Write-Host "Checking HTTP endpoint..."
$httpCheck = Invoke-Ssh "curl -f -s http://localhost:8088/api/health >/dev/null 2>&1; echo `$?" 2>$null
if ($httpCheck -notmatch '^0') {
    Write-Host "Backend is running but not responding to HTTP requests!" -ForegroundColor Red
    Write-Host ""
    Write-Host "=== Checking .env Configuration ===" -ForegroundColor Yellow
    $envCheck = Invoke-Ssh "cd '$BackendDest' && if [ -f .env ]; then echo 'ADDRESS='`$(grep '^ADDRESS=' .env 2>/dev/null || echo 'NOT SET'); echo 'PORT='`$(grep '^PORT=' .env 2>/dev/null || echo 'NOT SET'); echo 'DB_DIALECT='`$(grep '^DB_DIALECT=' .env 2>/dev/null || echo 'NOT SET'); echo ''; ADDRESS_VALUE=`$(grep '^ADDRESS=' .env | cut -d'=' -f2); if [ `"`$ADDRESS_VALUE`" = 'localhost' ]; then echo 'WARNING: ADDRESS is set to localhost - server may not be accessible from outside!'; echo 'Consider changing to ADDRESS=0.0.0.0 in $BackendDest/.env'; fi; else echo '.env file not found!'; fi"
    Write-Host $envCheck
    Write-Host ""
    Write-Host "=== PM2 Logs ===" -ForegroundColor Yellow
    Invoke-Ssh "pm2 logs chorleiter-api --lines 30 --nostream 2>/dev/null || echo 'No PM2 logs available'"
    Write-Host "=== Exception Log ===" -ForegroundColor Yellow
    Invoke-Ssh "tail -n 20 '$BackendDest/logs/exceptions.log' 2>/dev/null || echo 'No exceptions log found'"
    Remove-Item $BackendArchive
    Remove-Item $FrontendArchive
    throw "Backend HTTP endpoint not responding."
}

Remove-Item $BackendArchive
Remove-Item $FrontendArchive

Write-Host "Deployment completed."

# Close the persistent SSH connection (best-effort)
if (-not $sshUsePlink) {
    Write-VerboseLog "Closing SSH connection..."
    & ssh -O exit $Remote 2>$null
}

} else {
    Write-Host "Build completed. Skipped deployment (use -Upload flag to deploy to server)."
}

Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Successully deployed"
}
catch {
    Write-Error $_
    $script:DeployFailed = $true
}
finally {
    Write-Host ("[{0}] Script finished" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
}

if ($script:DeployFailed) {
    exit 1
}
