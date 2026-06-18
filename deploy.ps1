param(
    [switch]$Verbose,
    [switch]$Frontend,
    [switch]$Backend,
    [switch]$Upload
)

# Determine what to build (default: all)
$buildFrontend = $Frontend.IsPresent
$buildBackend  = $Backend.IsPresent
$uploadOnly    = $Upload.IsPresent

# If no specific flags provided, build everything
if (-not $buildFrontend -and -not $buildBackend -and -not $uploadOnly) {
    $buildFrontend = $true
    $buildBackend  = $true
    $uploadOnly    = $true
}

$ErrorActionPreference = 'Stop'
$VerboseLogging = $Verbose.IsPresent

# ---- Configuration --------------------------------------------------------
# Load local deploy config (gitignored, never committed).
# Create deploy.local.ps1 from deploy.local.example.ps1.
$localConfig = Join-Path $PSScriptRoot "deploy.local.ps1"
if (Test-Path $localConfig) {
    . $localConfig
} elseif ($uploadOnly) {
    Write-Host "Hint: create deploy.local.ps1 from deploy.local.example.ps1 to avoid setting env vars each time." -ForegroundColor Cyan
}

$RemoteUser   = $env:CHORLEITER_DEPLOY_USER
$RemoteHost   = $env:CHORLEITER_DEPLOY_HOST
$BackendDest  = $env:CHORLEITER_BACKEND_DEST
$FrontendDest = $env:CHORLEITER_FRONTEND_DEST
$Pm2AppName   = if ($env:CHORLEITER_PM2_APP)       { $env:CHORLEITER_PM2_APP }      else { 'chorleiter-api' }
$BackendPort  = if ($env:CHORLEITER_BACKEND_PORT)  { $env:CHORLEITER_BACKEND_PORT } else { '8088' }
$SshKeyFile   = $env:CHORLEITER_SSH_KEY_FILE   # optional path to .ppk for plink

if ($uploadOnly) {
    if (-not $RemoteUser -or -not $RemoteHost -or -not $BackendDest -or -not $FrontendDest) {
        throw @"
Deploy configuration is incomplete. Create deploy.local.ps1 from deploy.local.example.ps1,
or set the following environment variables before running this script:
  CHORLEITER_DEPLOY_USER    - SSH username
  CHORLEITER_DEPLOY_HOST    - server hostname or IP
  CHORLEITER_BACKEND_DEST   - absolute path on server for the backend
  CHORLEITER_FRONTEND_DEST  - absolute path on server for the frontend HTML
"@
    }
}

$Remote      = "$RemoteUser@$RemoteHost"
$PasswordFile = "$env:USERPROFILE\.chorleiter_deploy_pw"
# ---- End configuration ---------------------------------------------------

# Script-scope state (needed in finally)
$script:DeployFailed    = $false
$script:BackendArchive  = $null
$script:FrontendArchive = $null
$script:Password        = $null

if ($VerboseLogging) {
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Starting deployment script in verbose mode"
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Options: Frontend=$buildFrontend Backend=$buildBackend Upload=$uploadOnly"
} else {
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Starting deployment script"
}

# UTF-8 encoding for correct Linux output
[Console]::InputEncoding  = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

function Write-VerboseLog {
    param([string]$Message)
    if ($VerboseLogging) { Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $Message" }
}

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
    # Check if frontend build is already up-to-date
    $skipBuild = $false
    $distPath      = Join-Path $PSScriptRoot "choir-app-frontend/dist/choir-app-frontend/browser"
    $buildInfoPath = Join-Path $PSScriptRoot "choir-app-frontend/src/environments/build-info.ts"

    if ((Test-Path $distPath) -and (Test-Path $buildInfoPath)) {
        $currentCommit   = (git rev-parse --short HEAD 2>$null)
        $frontendChanges = (git status --porcelain -- choir-app-frontend/src/ 2>$null)

        if ($currentCommit -and -not $frontendChanges) {
            $buildInfoContent = Get-Content $buildInfoPath -Raw
            if ($buildInfoContent -match "commit:\s*'($currentCommit)'") {
                Write-Host "Frontend build is already up-to-date (commit: $currentCommit). Skipping build." -ForegroundColor Green
                $skipBuild = $true
            }
        }
    }

    if (-not $skipBuild) {
        Write-Host "Building Angular frontend..."
        npm --prefix choir-app-frontend run build
        if ($LASTEXITCODE -ne 0) { throw "Build failed. Aborting deployment." }
        Write-Host "Build finished."
    }
}

if ($buildBackend) {
    # Verify backend can start by syntax checking server.js
    npm --prefix choir-app-backend run check
}

if ($uploadOnly) {
# --- SSH authentication ---------------------------------------------------
$sshUseAgent = $false
$sshUsePlink = $false

if (Get-Command ssh-add -ErrorAction SilentlyContinue) {
    try {
        $keys = ssh-add -L 2>$null
        if ($LASTEXITCODE -eq 0 -and $keys) {
            $sshUseAgent = $true
            Write-Host "Using ssh-agent for authentication."
        }
    } catch {}
}

if (-not $sshUseAgent) {
    if (Get-Command plink -ErrorAction SilentlyContinue) {
        $sshUsePlink = $true
        if ($SshKeyFile) {
            Write-Host "Using plink with SSH key file for authentication."
        } else {
            Write-Host "Using plink for authentication."
        }
    }
}

if ($sshUseAgent) {
    Write-Host "Verifying ssh-agent access..."
    # accept-new: silently accepts a new host key on first connect, but rejects a
    # *changed* fingerprint. Unlike 'no', which silently accepts changes (MITM risk).
    & ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new $Remote exit 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ssh-agent authentication failed, falling back to password." -ForegroundColor Yellow
        $sshUseAgent = $false
        if (Get-Command plink -ErrorAction SilentlyContinue) {
            $sshUsePlink = $true
        }
    }
}

if (-not $sshUseAgent -and -not $sshUsePlink) {
    Write-Host "plink not found and no ssh-agent keys loaded. You will be prompted for the password." -ForegroundColor Yellow
}

# --- Password handling (only when plink is used without a key file) -------
if (-not $sshUseAgent -and -not $SshKeyFile) {
    if (Test-Path $PasswordFile) {
        # Warn if the file may be readable by other accounts
        try {
            $acl = Get-Acl $PasswordFile
            $otherAccess = $acl.Access | Where-Object {
                $_.IdentityReference -notmatch [regex]::Escape($env:USERNAME) -and
                $_.FileSystemRights  -notmatch 'Synchronize' -and
                $_.IdentityReference -notmatch '^BUILTIN\\Administrators'
            }
            if ($otherAccess) {
                Write-Host "Warning: $PasswordFile may be readable by other accounts. Run to restrict:" -ForegroundColor Yellow
                Write-Host "  icacls `"$PasswordFile`" /inheritance:r /grant:r `"${env:USERDOMAIN}\${env:USERNAME}:(R)`"" -ForegroundColor Yellow
            }
        } catch {}
        $script:Password = (Get-Content $PasswordFile -Raw).Trim()
        if ($script:Password) { Write-Host "Using password from $PasswordFile." }
    } else {
        $create = Read-Host "Password file $PasswordFile not found. Create it? (y/N)"
        if ($create -match '^[Yy]') {
            $securePass = Read-Host "SSH password for $Remote" -AsSecureString
            $script:Password = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
                [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePass)
            )
            Set-Content -Path $PasswordFile -Value $script:Password -NoNewline
            # Restrict to current user only
            icacls $PasswordFile /inheritance:r /grant:r "${env:USERDOMAIN}\${env:USERNAME}:(R)" 2>$null | Out-Null
            Write-Host "Password saved to $PasswordFile with restricted permissions."
        }
    }
    if (-not $script:Password) {
        $securePass = Read-Host "SSH password for $Remote" -AsSecureString
        $script:Password = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
            [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePass)
        )
    }
    if ($sshUsePlink -and $script:Password) {
        Write-Warning "SSH password is passed as a plink argument and may appear in process listings. Set CHORLEITER_SSH_KEY_FILE in deploy.local.ps1 to use key-based auth instead."
    }
}
# ---- End authentication --------------------------------------------------

function Invoke-Ssh {
    param([string]$Command)

    if ($sshUsePlink) {
        $plinkArgs = @('-batch')
        if ($SshKeyFile) {
            if ($VerboseLogging) { $plinkArgs += '-v' }
            $plinkArgs += @('-i', $SshKeyFile)
        } elseif ($script:Password) {
            # Verbose mode is intentionally omitted here to avoid logging the password.
            # Use an SSH key file (CHORLEITER_SSH_KEY_FILE) for verbose deploys.
            $plinkArgs += @('-pw', "$($script:Password)")
        }
        $plinkArgs += @('-l', $RemoteUser, $RemoteHost, $Command)
        & plink @plinkArgs
    }
    else {
        $sshArgs = @()
        if ($VerboseLogging) { $sshArgs += '-v' }
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
        $pscpArgs = @('-batch')
        if ($SshKeyFile) {
            if ($VerboseLogging) { $pscpArgs += '-v' }
            $pscpArgs += @('-i', $SshKeyFile)
        } elseif ($script:Password) {
            $pscpArgs += @('-pw', "$($script:Password)")
        }
        $pscpArgs += @('-l', $RemoteUser, $Source, $Destination)
        & pscp @pscpArgs
    }
    else {
        $scpArgs = @()
        if ($VerboseLogging) { $scpArgs += '-v' }
        $scpArgs += @($Source, $Destination)
        & scp @scpArgs
    }
}

# Ensure we're in the root directory for tar operations
Push-Location $PSScriptRoot

Write-Host "Requesting temporary files for packaging..."
$script:BackendArchive  = [IO.Path]::GetFullPath([IO.Path]::GetTempFileName() + ".tar.gz")
$script:FrontendArchive = [IO.Path]::GetFullPath([IO.Path]::GetTempFileName() + ".tar.gz")

Write-VerboseLog "Backend archive path: $($script:BackendArchive)"
Write-VerboseLog "Frontend archive path: $($script:FrontendArchive)"

# Pack directories
Write-Host "Compressing now..."

$BackendSourcePath  = Join-Path $PSScriptRoot "choir-app-backend"
$FrontendSourcePath = Join-Path $PSScriptRoot "choir-app-frontend/dist/choir-app-frontend/browser"

Write-VerboseLog "Backend source: $BackendSourcePath"
Write-VerboseLog "Frontend source: $FrontendSourcePath"

if (-not (Test-Path $BackendSourcePath))  { throw "Backend directory not found: $BackendSourcePath" }
if (-not (Test-Path $FrontendSourcePath)) { throw "Frontend directory not found: $FrontendSourcePath" }

Write-VerboseLog "Compressing backend (excluding node_modules, logs, uploads)..."
$tarArgs = @('--exclude=.env', '--exclude=node_modules', '--exclude=logs', '--exclude=uploads', '-czf', $script:BackendArchive, '-C', $BackendSourcePath, '.')
& tar $tarArgs
if ($LASTEXITCODE -ne 0) {
    throw "Backend compression failed with exit code $LASTEXITCODE. Command: tar $($tarArgs -join ' ')"
}
Write-Host "Backend compressed successfully."

Write-VerboseLog "Compressing frontend..."
$tarArgs = @('-czf', $script:FrontendArchive, '-C', $FrontendSourcePath, '.')
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
Invoke-Scp $script:BackendArchive "${Remote}:/tmp/backend.tar.gz"
Write-VerboseLog "Backend archive uploaded."

Write-Host "Uploading frontend archive..."
Invoke-Scp $script:FrontendArchive "${Remote}:/tmp/frontend.tar.gz"
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
Invoke-Ssh "pm2 restart $Pm2AppName"
Write-VerboseLog "Backend restart command sent."

Write-Host "Waiting 10 seconds for backend to start..."
Start-Sleep -Seconds 10

# Verify backend started
Write-Host "Checking PM2 status..."
$pm2Status = Invoke-Ssh "pm2 describe $Pm2AppName | grep -i status" 2>$null
if ($pm2Status -notmatch 'online') {
    Write-Host "Backend process failed to start. Recent log output:" -ForegroundColor Red
    Write-Host "=== PM2 Logs ===" -ForegroundColor Yellow
    Invoke-Ssh "pm2 logs $Pm2AppName --lines 30 --nostream 2>/dev/null || echo 'No PM2 logs available'"
    Write-Host "=== Exception Log ===" -ForegroundColor Yellow
    Invoke-Ssh "tail -n 20 '$BackendDest/logs/exceptions.log' 2>/dev/null || echo 'No exceptions log found'"
    throw "Backend failed to start."
}

# Verify HTTP endpoint is responding
Write-Host "Checking HTTP endpoint..."
$httpCheck = Invoke-Ssh "curl -f -s http://localhost:${BackendPort}/api/health >/dev/null 2>&1; echo `$?" 2>$null
if ($httpCheck -notmatch '^0') {
    Write-Host "Backend is running but not responding to HTTP requests!" -ForegroundColor Red
    Write-Host ""
    Write-Host "=== Checking .env Configuration ===" -ForegroundColor Yellow
    $envCheck = Invoke-Ssh "cd '$BackendDest' && if [ -f .env ]; then echo 'ADDRESS='`$(grep '^ADDRESS=' .env 2>/dev/null || echo 'NOT SET'); echo 'PORT='`$(grep '^PORT=' .env 2>/dev/null || echo 'NOT SET'); echo 'DB_DIALECT='`$(grep '^DB_DIALECT=' .env 2>/dev/null || echo 'NOT SET'); echo ''; ADDRESS_VALUE=`$(grep '^ADDRESS=' .env | cut -d'=' -f2); if [ `"`$ADDRESS_VALUE`" = 'localhost' ]; then echo 'WARNING: ADDRESS is set to localhost - server may not be accessible from outside!'; echo 'Consider changing to ADDRESS=0.0.0.0 in $BackendDest/.env'; fi; else echo '.env file not found!'; fi"
    Write-Host $envCheck
    Write-Host ""
    Write-Host "=== PM2 Logs ===" -ForegroundColor Yellow
    Invoke-Ssh "pm2 logs $Pm2AppName --lines 30 --nostream 2>/dev/null || echo 'No PM2 logs available'"
    Write-Host "=== Exception Log ===" -ForegroundColor Yellow
    Invoke-Ssh "tail -n 20 '$BackendDest/logs/exceptions.log' 2>/dev/null || echo 'No exceptions log found'"
    throw "Backend HTTP endpoint not responding."
}

Write-Host "Deployment completed."

# Close shared SSH connection if multiplexing was used
if (-not $sshUsePlink) {
    Write-VerboseLog "Closing SSH connection..."
    & ssh -O exit $Remote 2>$null
}

} else {
    Write-Host "Build completed. Skipped deployment (use -Upload flag to deploy to server)."
}

Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Successfully deployed"
}
catch {
    Write-Error $_
    $script:DeployFailed = $true
}
finally {
    # Clean up local temp files regardless of success or failure
    if ($script:BackendArchive  -and (Test-Path $script:BackendArchive))  { Remove-Item $script:BackendArchive  -Force -ErrorAction SilentlyContinue }
    if ($script:FrontendArchive -and (Test-Path $script:FrontendArchive)) { Remove-Item $script:FrontendArchive -Force -ErrorAction SilentlyContinue }

    # Clear password from memory
    $script:Password = $null

    Write-Host ("[{0}] Script finished" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
}

if ($script:DeployFailed) {
    exit 1
}
