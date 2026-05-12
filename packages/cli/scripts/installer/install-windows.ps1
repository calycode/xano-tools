#Requires -Version 5.1
<#
.SYNOPSIS
    Windows installer entrypoint.

.DESCRIPTION
    Delegates to the existing shared PowerShell installer implementation (install.ps1).
#>

[CmdletBinding()]
param(
   [Parameter(ValueFromRemainingArguments = $true)]
   [string[]]$Args
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$target = Join-Path $scriptDir 'install.ps1'

& $target @Args
exit $LASTEXITCODE
