$ErrorActionPreference = 'Stop'

$PasswordFile = "$env:USERPROFILE\.chorleiter_deploy_pw"
$RemoteUser = "root"
$RemoteHost = "88.222.220.28"
$Remote = "$RemoteUser@$RemoteHost"
$BackendDest = "/usr/local/lsws/ChorStatistik/backend"
$FrontendDest = "/usr/local/lsws/ChorStatistik/html"

# Build Angular frontend
npm --prefix choir-app-frontend run build

Write-Host "Build finished."

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


$ControlPath = Join-Path $env:USERPROFILE ".chorleiter_ssh_control"
$SshOptions = @(
    "-o", "ControlMaster=auto",
    "-o", "ControlPath=$ControlPath",
    "-o", "ControlPersist=10m",
    "-o", "StrictHostKeyChecking=no"
)

function Invoke-Ssh {
    param(
        [string]$Command
    )

    if ($sshUsePlink) {
        & plink -batch -pw "$Password" $Remote $Command
    }
    else {
        & ssh @SshOptions $Remote $Command
    }
}

function Invoke-Scp {
    param(
        [string]$Source,
        [string]$Destination
    )

    if ($sshUsePlink) {
        & pscp -batch -pw "$Password" $Source $Destination
    }
    else {
        & scp @SshOptions $Source $Destination
    }
}

# Establish master connection so the password is requested only once
Write-Host "Establishing SSH connection..."
Invoke-Ssh "true"

$BackendArchive = [IO.Path]::GetTempFileName() + ".tar.gz"
$FrontendArchive = [IO.Path]::GetTempFileName() + ".tar.gz"

# Pack directories
Write-Host "Packing backend..."
& tar --exclude=".env" -czf $BackendArchive -C "choir-app-backend" .
Write-Host "Packing frontend..."
& tar -czf $FrontendArchive -C "choir-app-frontend/dist/choir-app-frontend/browser" .

# Create remote directories
Write-Host "Creating remote directories..."
Invoke-Ssh "mkdir -p '$BackendDest' '$FrontendDest'"

# Upload archives
Invoke-Scp $BackendArchive "${Remote}:/tmp/backend.tar.gz"
Invoke-Scp $FrontendArchive "${Remote}:/tmp/frontend.tar.gz"

# Extract archives on server and clean up
Invoke-Ssh "tar -xzf /tmp/backend.tar.gz -C '$BackendDest'; rm /tmp/backend.tar.gz"
Invoke-Ssh "tar -xzf /tmp/frontend.tar.gz -C '$FrontendDest'; rm /tmp/frontend.tar.gz"

# Restart backend
Invoke-Ssh "pm2 restart chorleiter-api"

Remove-Item $BackendArchive
Remove-Item $FrontendArchive

Write-Host "Deployment completed."

# Close the persistent SSH connection
if (-not $sshUsePlink) {
    & ssh @SshOptions -O exit $Remote
}
