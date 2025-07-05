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

# Check for sshpass before proceeding
$sshUseSshpass = $false
if (Get-Command sshpass -ErrorAction SilentlyContinue) {
    $sshUseSshpass = $true
} else {
    $install = Read-Host "sshpass is not installed. Install it now? (y/N)"
    if ($install -match '^[Yy]') {
        try {
            if (Get-Command apt-get -ErrorAction SilentlyContinue) {
                & sudo apt-get install sshpass
            } elseif (Get-Command choco -ErrorAction SilentlyContinue) {
                & choco install -y sshpass
            } else {
                Write-Host "No supported package manager found. Install sshpass manually." -ForegroundColor Yellow
            }
        } catch {
            Write-Host "Failed to install sshpass." -ForegroundColor Red
        }
        # Re-check after attempted installation
        if (Get-Command sshpass -ErrorAction SilentlyContinue) {
            $sshUseSshpass = $true
        } else {
            Write-Host "sshpass installation failed or command not found." -ForegroundColor Red
        }
    }
    if (-not $sshUseSshpass) {
        Write-Host "Hint: install sshpass manually (e.g. 'choco install sshpass')"
    }
}

$Password = $null
if (Test-Path $PasswordFile) {
    $Password = (Get-Content $PasswordFile -Raw).Trim()
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

    if ($sshUseSshpass) {
        & sshpass -p "$Password" ssh @SshOptions $Remote $Command
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

    if ($sshUseSshpass) {
        & sshpass -p "$Password" scp @SshOptions $Source $Destination
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
if ($sshUseSshpass) {
    & sshpass -p "$Password" ssh @SshOptions -O exit $Remote
}
else {
    & ssh @SshOptions -O exit $Remote
}
