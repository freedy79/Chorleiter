param(
    [string]$RemoteHost = '88.222.220.28',
    [string]$RemoteUser = 'root',
    [string]$RemoteBackupDir = '/usr/local/lsws/ChorStatistik/backend/backups',
    [string]$HostKeyFingerprint,
    [string]$PasswordFile = "$env:USERPROFILE\.chorleiter_deploy_pw",
    [string]$LocalBackupDir = "$PSScriptRoot\..\backups",
    [switch]$RestoreToTestDb,
    [string]$TestDbName = 'chorleiter_migration_test',
    [string]$DbUser = 'postgres',
    [string]$DbPassword = 'postgres',
    [int]$DbPort = 5433
)

$ErrorActionPreference = 'Stop'

function Fail($msg) {
    Write-Error $msg
    exit 1
}

function Ensure-Cmd($name, $customPath = $null) {
    if ($customPath) {
        if (!(Test-Path $customPath)) { Fail "Required executable not found: $customPath" }
        return $customPath
    }

    $cmd = Get-Command $name -ErrorAction SilentlyContinue
    if (!$cmd) { Fail "Required executable '$name' not found in PATH." }
    return $cmd.Source
}

if ([string]::IsNullOrWhiteSpace($HostKeyFingerprint)) {
    Fail 'HostKeyFingerprint is required for secure host verification (MITM protection).'
}

$plink = Ensure-Cmd 'plink'
$pscp = Ensure-Cmd 'pscp'
$sha256 = Ensure-Cmd 'Get-FileHash'

if (!(Test-Path $PasswordFile)) {
    Fail "Password file not found: $PasswordFile"
}

$password = (Get-Content $PasswordFile -Raw).Trim()
if ([string]::IsNullOrWhiteSpace($password)) {
    Fail "Password file is empty: $PasswordFile"
}

if (!(Test-Path $LocalBackupDir)) {
    New-Item -Path $LocalBackupDir -ItemType Directory -Force | Out-Null
}

$remote = "$RemoteUser@$RemoteHost"

Write-Host '[1/5] Fetching latest backup filename...'
$latest = & $plink -batch -hostkey $HostKeyFingerprint -l $RemoteUser -pw $password $RemoteHost "ls -1t $RemoteBackupDir/backup-*.sql | head -n 1"
$latest = ($latest | Select-Object -First 1).Trim()
if ([string]::IsNullOrWhiteSpace($latest)) {
    Fail 'No backup file found on remote host.'
}

if ($latest -notmatch '^/.+/backup-[0-9T\-]+Z\.sql$') {
    Fail "Unexpected backup filename format received: $latest"
}

$fileName = [System.IO.Path]::GetFileName($latest)
$localFile = Join-Path $LocalBackupDir $fileName

Write-Host '[2/5] Reading remote SHA256...'
$remoteShaRaw = & $plink -batch -hostkey $HostKeyFingerprint -l $RemoteUser -pw $password $RemoteHost "sha256sum $latest | awk '{print \$1}'"
$remoteSha = ($remoteShaRaw | Select-Object -First 1).Trim().ToLower()
if ($remoteSha -notmatch '^[a-f0-9]{64}$') {
    Fail "Invalid remote SHA256 received: $remoteSha"
}

Write-Host '[3/5] Downloading backup snapshot...'
& $pscp -batch -hostkey $HostKeyFingerprint -l $RemoteUser -pw $password "$remote`:$latest" "$localFile"

if (!(Test-Path $localFile)) {
    Fail "Downloaded file missing: $localFile"
}

Write-Host '[4/5] Verifying local SHA256...'
$localSha = (Get-FileHash -Path $localFile -Algorithm SHA256).Hash.ToLower()
if ($localSha -ne $remoteSha) {
    Remove-Item -Path $localFile -Force -ErrorAction SilentlyContinue
    Fail "Checksum mismatch. Download aborted and file removed."
}

Write-Host "Snapshot verified: $localFile"

if ($RestoreToTestDb) {
    Write-Host '[5/5] Restoring snapshot into isolated test database...'
    $psqlCandidates = @(
        'C:/Program Files/PostgreSQL/18/bin/psql.exe',
        'C:/Program Files/PostgreSQL/17/bin/psql.exe',
        'C:/Program Files/PostgreSQL/16/bin/psql.exe',
        'C:/Program Files/PostgreSQL/15/bin/psql.exe'
    )
    $psql = $psqlCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
    if (!$psql) {
        Fail 'psql.exe not found in standard PostgreSQL installation paths.'
    }

    $env:PGPASSWORD = $DbPassword
    & $psql -U $DbUser -h localhost -p $DbPort -d postgres -c "DROP DATABASE IF EXISTS $TestDbName;"
    & $psql -U $DbUser -h localhost -p $DbPort -d postgres -c "CREATE DATABASE $TestDbName;"
    & $psql -U $DbUser -h localhost -p $DbPort -d $TestDbName -f $localFile | Out-Null

    Write-Host "Restored snapshot to: $TestDbName"
}

Write-Host 'Secure snapshot workflow completed successfully.'
