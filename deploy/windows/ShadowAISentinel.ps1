<#
.SYNOPSIS
  Install, remove or check the Shadow AI Sentinel browser-extension policy on Windows
  (Chrome and/or Edge), machine-wide.

.DESCRIPTION
  The extension is installed by the browser itself from its store: this script only writes the
  enterprise policy that tells the browser to force-install it, and (optionally) the extension's
  managed configuration. Nothing is downloaded by this script and no service is installed.

  What it writes (HKLM\SOFTWARE\Policies):
    <vendor>\ExtensionInstallForcelist            one numbered value "<id>;<update url>"
    <vendor>\3rdparty\extensions\<id>\policy      one value per managed setting
  with <vendor> = Google\Chrome or Microsoft\Edge.

  Idempotent: running Install twice leaves the same registry state. Before any change the
  affected vendor key is exported to
  %ProgramData%\ShadowAISentinel\backup-<timestamp>-<browser>.reg
  (rollback: run -Action Uninstall, then "reg import <that file>").

  Requires: Windows PowerShell 5.1+, administrator rights (or SYSTEM, e.g. Intune).
  Chrome and Edge only honour force-install on a domain-joined or MDM-managed device.

.PARAMETER Action
  Install | Uninstall | Status. Status changes nothing and exits 0 only if everything is in place.

.PARAMETER ExtensionId
  The 32-letter extension ID shown in the Chrome Web Store listing URL.

.PARAMETER Browser
  Chrome, Edge, or both (default). Edge installs the same Chrome Web Store listing.

.PARAMETER UpdateUrl
  Update manifest URL. Default: Chrome Web Store.

.PARAMETER PolicyFile
  Optional JSON file with the managed configuration (see deploy\policy\*.json).
  On Install without -PolicyFile, an existing managed configuration is left untouched.

.EXAMPLE
  .\ShadowAISentinel.ps1 -Action Install -ExtensionId abcdefghijklmnopabcdefghijklmnop -PolicyFile ..\policy\managed-policy.recommended.json

.EXAMPLE
  .\ShadowAISentinel.ps1 -Action Status -ExtensionId abcdefghijklmnopabcdefghijklmnop

.EXAMPLE
  .\ShadowAISentinel.ps1 -Action Uninstall -ExtensionId abcdefghijklmnopabcdefghijklmnop
#>
[CmdletBinding()]
param(
  [ValidateSet('Install', 'Uninstall', 'Status')]
  [string]$Action = 'Status',

  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[a-p]{32}$')]
  [string]$ExtensionId,

  [ValidateSet('Chrome', 'Edge')]
  [string[]]$Browser = @('Chrome', 'Edge'),

  [string]$UpdateUrl = 'https://clients2.google.com/service/update2/crx',

  [string]$PolicyFile
)

$ErrorActionPreference = 'Stop'

$VendorKeys = @{
  Chrome = 'HKLM:\SOFTWARE\Policies\Google\Chrome'
  Edge   = 'HKLM:\SOFTWARE\Policies\Microsoft\Edge'
}
$AllowedSettings = @('fail_mode', 'lock_settings', 'emailDomains', 'rules', 'allowlist')
$script:Problems = 0

function Write-Check([string]$Status, [string]$Message) {
  Write-Output ("[{0}] {1}" -f $Status, $Message)
}

function Test-Admin {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Read-ManagedPolicy([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Policy file not found: $Path"
  }
  try {
    $policy = Get-Content -LiteralPath $Path -Raw -Encoding UTF8 | ConvertFrom-Json
  } catch {
    throw "Policy file is not valid JSON: $Path ($($_.Exception.Message))"
  }
  foreach ($name in $policy.PSObject.Properties.Name) {
    if ($AllowedSettings -notcontains $name) {
      throw "Unknown setting '$name' in $Path. Allowed: $($AllowedSettings -join ', ')"
    }
  }
  if ($policy.PSObject.Properties.Name -contains 'fail_mode') {
    if (@('open', 'warn', 'closed') -notcontains $policy.fail_mode) {
      throw "fail_mode must be open, warn or closed (got '$($policy.fail_mode)')"
    }
  }
  return $policy
}

function Get-ForcelistKey([string]$Vendor) {
  return (Join-Path $Vendor 'ExtensionInstallForcelist')
}

function Get-ExtensionKey([string]$Vendor) {
  return (Join-Path $Vendor "3rdparty\extensions\$ExtensionId")
}

# Name of the numbered value that already holds this extension, or $null.
function Find-ForcelistEntry([string]$Key) {
  if (-not (Test-Path -LiteralPath $Key)) { return $null }
  $item = Get-Item -LiteralPath $Key
  foreach ($name in $item.GetValueNames()) {
    $value = [string]$item.GetValue($name)
    if ($value -eq $ExtensionId -or $value.StartsWith("$ExtensionId;")) { return $name }
  }
  return $null
}

function Get-FreeForcelistName([string]$Key) {
  $used = @()
  if (Test-Path -LiteralPath $Key) { $used = @((Get-Item -LiteralPath $Key).GetValueNames()) }
  $index = 1
  while ($used -contains [string]$index) { $index++ }
  return [string]$index
}

function Backup-Keys([string]$BrowserName, [string]$Vendor) {
  if (-not (Test-Path -LiteralPath $Vendor)) { return }
  $dir = Join-Path $env:ProgramData 'ShadowAISentinel'
  New-Item -ItemType Directory -Path $dir -Force | Out-Null
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $file = Join-Path $dir ("backup-{0}-{1}.reg" -f $stamp, $BrowserName)
  $native = $Vendor -replace '^HKLM:\\', 'HKLM\'
  & reg.exe export $native $file /y | Out-Null
  if ($LASTEXITCODE -eq 0) {
    Write-Check 'INFO' "${BrowserName}: previous policy saved to $file"
  }
}

function Install-ForBrowser([string]$BrowserName, $Policy) {
  $vendor = $VendorKeys[$BrowserName]
  Backup-Keys $BrowserName $vendor

  $forcelist = Get-ForcelistKey $vendor
  if (-not (Test-Path -LiteralPath $forcelist)) { New-Item -Path $forcelist -Force | Out-Null }
  $name = Find-ForcelistEntry $forcelist
  if ($null -eq $name) { $name = Get-FreeForcelistName $forcelist }
  New-ItemProperty -LiteralPath $forcelist -Name $name -Value "$ExtensionId;$UpdateUrl" -PropertyType String -Force | Out-Null
  Write-Check 'OK' "${BrowserName}: force-install entry written (value $name)"

  if ($null -eq $Policy) { return }

  $policyKey = Join-Path (Get-ExtensionKey $vendor) 'policy'
  if (Test-Path -LiteralPath $policyKey) { Remove-Item -LiteralPath $policyKey -Recurse -Force }
  New-Item -Path $policyKey -Force | Out-Null
  $count = 0
  foreach ($property in $Policy.PSObject.Properties) {
    $value = $property.Value
    if ($value -is [bool]) {
      New-ItemProperty -LiteralPath $policyKey -Name $property.Name -Value ([int]$value) -PropertyType DWord -Force | Out-Null
    } elseif ($value -is [string]) {
      New-ItemProperty -LiteralPath $policyKey -Name $property.Name -Value $value -PropertyType String -Force | Out-Null
    } else {
      # Lists: Chrome/Edge accept a JSON string for list policies. -InputObject keeps a
      # one-element (or empty) list as a JSON array instead of unwrapping it.
      $json = ConvertTo-Json -InputObject @($value) -Compress -Depth 8
      New-ItemProperty -LiteralPath $policyKey -Name $property.Name -Value $json -PropertyType String -Force | Out-Null
    }
    $count++
  }
  Write-Check 'OK' "${BrowserName}: managed configuration written ($count setting(s))"
}

function Uninstall-ForBrowser([string]$BrowserName) {
  $vendor = $VendorKeys[$BrowserName]
  Backup-Keys $BrowserName $vendor

  $forcelist = Get-ForcelistKey $vendor
  $name = Find-ForcelistEntry $forcelist
  while ($null -ne $name) {
    Remove-ItemProperty -LiteralPath $forcelist -Name $name -Force
    $name = Find-ForcelistEntry $forcelist
  }
  $extensionKey = Get-ExtensionKey $vendor
  if (Test-Path -LiteralPath $extensionKey) { Remove-Item -LiteralPath $extensionKey -Recurse -Force }
  Write-Check 'OK' "${BrowserName}: force-install entry and managed configuration removed"
}

function Get-StatusForBrowser([string]$BrowserName) {
  $vendor = $VendorKeys[$BrowserName]
  $forcelist = Get-ForcelistKey $vendor
  $name = Find-ForcelistEntry $forcelist
  if ($null -eq $name) {
    Write-Check 'FAIL' "${BrowserName}: no force-install entry for $ExtensionId. Fix: run -Action Install."
    $script:Problems++
  } else {
    $value = [string](Get-Item -LiteralPath $forcelist).GetValue($name)
    Write-Check 'OK' "${BrowserName}: force-install entry present ($value)"
  }

  $policyKey = Join-Path (Get-ExtensionKey $vendor) 'policy'
  if (Test-Path -LiteralPath $policyKey) {
    $names = @((Get-Item -LiteralPath $policyKey).GetValueNames())
    $unknown = @($names | Where-Object { $AllowedSettings -notcontains $_ })
    if ($unknown.Count -gt 0) {
      Write-Check 'FAIL' "${BrowserName}: unknown managed setting(s): $($unknown -join ', '). Fix: re-run -Action Install with a valid -PolicyFile."
      $script:Problems++
    } else {
      Write-Check 'OK' "${BrowserName}: managed configuration present ($($names -join ', '))"
    }
  } else {
    Write-Check 'INFO' "${BrowserName}: no managed configuration (users keep local settings)"
  }

  $policyUrl = 'edge://policy'
  if ($BrowserName -eq 'Chrome') { $policyUrl = 'chrome://policy' }
  Write-Check 'INFO' "${BrowserName}: confirm in the browser at $policyUrl (Reload policies), then extension options > Diagnostic"
}

if ($Action -ne 'Status' -and -not (Test-Admin)) {
  Write-Check 'FAIL' 'Administrator rights are required. Fix: run from an elevated PowerShell, or deploy as SYSTEM (Intune).'
  exit 2
}

$policy = $null
if ($Action -eq 'Install' -and $PolicyFile) {
  $policy = Read-ManagedPolicy $PolicyFile
}

foreach ($name in $Browser) {
  if ($Action -eq 'Install') { Install-ForBrowser $name $policy }
  if ($Action -eq 'Uninstall') { Uninstall-ForBrowser $name }
  if ($Action -ne 'Uninstall') { Get-StatusForBrowser $name }
}

if ($script:Problems -gt 0) { exit 1 }
exit 0
