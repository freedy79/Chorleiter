param(
    [switch]$Verbose
)

$ErrorActionPreference = 'Stop'
$VerboseLogging = $Verbose.IsPresent

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
        Write-Host $Message
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

# Build Angular frontend
Write-Host "Building Angular frontend..."
npm --prefix choir-app-frontend run build
if ($LASTEXITCODE -ne 0) {
    throw "Build failed. Aborting deployment."
}

Write-Host "Build finished."

# Verify backend can start by syntax checking server.js
npm --prefix choir-app-backend run check

# Determine authentication method
$sshUseAgent = $false
$sshUsePlink = $false

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

$BackendArchive = [IO.Path]::GetTempFileName() + ".tar.gz"
$FrontendArchive = [IO.Path]::GetTempFileName() + ".tar.gz"

# Pack directories
& tar --exclude=".env" -czf $BackendArchive -C "choir-app-backend" .
& tar -czf $FrontendArchive -C "choir-app-frontend/dist/choir-app-frontend/browser" .

# Create remote directories
Invoke-Ssh "mkdir -p '$BackendDest' '$FrontendDest'"

# Remove existing frontend files before uploading new ones
Write-Host "Removing old frontend files..."
Invoke-Ssh "rm -rf '$FrontendDest'/*"

# Upload archives
Invoke-Scp $BackendArchive "${Remote}:/tmp/backend.tar.gz"
Invoke-Scp $FrontendArchive "${Remote}:/tmp/frontend.tar.gz"

# Extract archives on server and clean up
Invoke-Ssh "tar -xzf /tmp/backend.tar.gz -C '$BackendDest'; rm /tmp/backend.tar.gz"
Invoke-Ssh "tar -xzf /tmp/frontend.tar.gz -C '$FrontendDest'; rm /tmp/frontend.tar.gz"

# Create database backup
Write-Host "Creating database backup on server..."
Invoke-Ssh "cd '$BackendDest' && npm run backup"

# Ensure backend dependencies are installed
Invoke-Ssh "cd '$BackendDest' && npm install"

# Restart backend
Invoke-Ssh "pm2 restart chorleiter-api"

# Verify backend started
$pm2Status = Invoke-Ssh "pm2 describe chorleiter-api | grep -i status" 2>$null
if ($pm2Status -notmatch 'online') {
    Write-Host "Backend failed to start. Recent log output:" -ForegroundColor Red
    Invoke-Ssh "tail -n 20 '$BackendDest/logs/exceptions.log' 2>/dev/null || echo 'No exceptions log found'"
    Remove-Item $BackendArchive
    Remove-Item $FrontendArchive
    throw "Backend failed to start."
}

Remove-Item $BackendArchive
Remove-Item $FrontendArchive

Write-Host "Deployment completed."

# Close the persistent SSH connection (best-effort)
if (-not $sshUsePlink) {
    Write-VerboseLog "Closing SSH connection..."
    & ssh -O exit $Remote 2>$null
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
