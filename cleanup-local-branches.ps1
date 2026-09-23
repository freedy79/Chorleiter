<#
.SYNOPSIS
Removes local Git branches that are merged or deleted on the remote.

.EXAMPLE
.\cleanup-local-branches.ps1 -DryRun

.EXAMPLE
.\cleanup-local-branches.ps1 -Force
#>
[CmdletBinding()]
param(
    [switch]$DryRun,
    [switch]$Force,
    [switch]$NoFetch,
    [ValidateNotNullOrEmpty()]
    [string]$Remote = 'origin'
)

$ErrorActionPreference = 'Stop'

$node = Get-Command node -ErrorAction SilentlyContinue
if (!$node) {
    Write-Error "Required executable 'node' was not found in PATH."
    exit 1
}

$cleanupScript = Join-Path $PSScriptRoot 'scripts\cleanup-local-branches.js'
if (!(Test-Path $cleanupScript -PathType Leaf)) {
    Write-Error "Branch cleanup script not found: $cleanupScript"
    exit 1
}

$nodeArguments = @($cleanupScript, '--remote', $Remote)
if ($DryRun) { $nodeArguments += '--dry-run' }
if ($Force) { $nodeArguments += '--force' }
if ($NoFetch) { $nodeArguments += '--no-fetch' }

Push-Location $PSScriptRoot
try {
    & $node.Source @nodeArguments
    $exitCode = $LASTEXITCODE
}
finally {
    Pop-Location
}

if ($exitCode -ne 0) {
    exit $exitCode
}
