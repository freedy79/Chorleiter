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

$Password = $null
if (Test-Path $PasswordFile) {
    $Password = (Get-Content $PasswordFile -Raw).Trim()
}
if (-not $Password) {
    $Password = Read-Host "SSH password for $Remote"
}

$sshCmd = "ssh"
$scpCmd = "scp"
if (Get-Command sshpass -ErrorAction SilentlyContinue) {
    $sshCmd = "sshpass -p `"$Password`" ssh -o StrictHostKeyChecking=no"
    $scpCmd = "sshpass -p `"$Password`" scp"
}

$BackendArchive = [IO.Path]::GetTempFileName() + ".tar.gz"
$FrontendArchive = [IO.Path]::GetTempFileName() + ".tar.gz"

# Pack directories
& tar --exclude=".env" -czf $BackendArchive -C "choir-app-backend" .
& tar -czf $FrontendArchive -C "choir-app-frontend/dist/choir-app-frontend/browser" .

# Create remote directories
Invoke-Expression "$sshCmd $Remote \"mkdir -p '$BackendDest' '$FrontendDest'\""

# Upload archives
Invoke-Expression "$scpCmd $BackendArchive $Remote:/tmp/backend.tar.gz"
Invoke-Expression "$scpCmd $FrontendArchive $Remote:/tmp/frontend.tar.gz"

# Extract archives on server and clean up
Invoke-Expression "$sshCmd $Remote \"tar -xzf /tmp/backend.tar.gz -C '$BackendDest' && rm /tmp/backend.tar.gz\""
Invoke-Expression "$sshCmd $Remote \"tar -xzf /tmp/frontend.tar.gz -C '$FrontendDest' && rm /tmp/frontend.tar.gz\""

Remove-Item $BackendArchive
Remove-Item $FrontendArchive

Write-Host "Deployment completed."
