$ErrorActionPreference = 'Stop'

$PasswordFile = "$env:USERPROFILE\.chorleiter_deploy_pw"
$RemoteUser = "root"
$RemoteHost = "88.222.220.28"
$Remote = "$RemoteUser@$RemoteHost"
$BackendDest = "/usr/local/lsws/ChorStatistik/backend"
$FrontendDest = "/usr/local/lsws/ChorStatistik/html"

# Ensure local repository is up to date
Write-Host "Checking git status..."
git fetch | Out-Null
$status = git status -uno
$changes = git status --porcelain
if ($changes -or $status -match 'behind') {
    $update = Read-Host "Repository is not up to date. Pull latest changes before deploying? (y/N)"
    if ($update -match '^[Yy]') {
        git pull --rebase
    } else {
        Write-Host "Continuing with current repository state."
    }
}

# Build Angular frontend
Write-Host "Building Angular frontend..."
npm --prefix choir-app-frontend run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed. Aborting deployment."
    exit 1
}

Write-Host "Build finished."

# Verify backend can start by syntax checking server.ts
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
        & plink -v -batch -l $RemoteUser -pw "$Password" $RemoteHost $Command
    }
    else {
        & ssh $Remote $Command
    }
}

function Invoke-Scp {
    param(
        [string]$Source,
        [string]$Destination
    )

    if ($sshUsePlink) {
        & pscp -v -batch -l $RemoteUser -pw "$Password" $Source $Destination
    }
    else {
        & scp $Source $Destination
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

Remove-Item $BackendArchive
Remove-Item $FrontendArchive

Write-Host "Deployment completed."

# Close the persistent SSH connection
if (-not $sshUsePlink) {
    & ssh @SshOptions -O exit $Remote
}

Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Successully deployed"
