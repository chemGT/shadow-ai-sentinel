<#
  Intune Win32-app detection script (also usable as a quick manual check).
  Intune treats the app as installed when this script exits 0 AND writes to standard output.
  Intune passes no parameters to detection scripts: set the two values below before uploading.
#>
$ExtensionId = 'REPLACE_WITH_32_LETTER_EXTENSION_ID'
$Browsers = @('Chrome', 'Edge')   # remove the one you do not deploy to

$Keys = @{
  Chrome = 'HKLM:\SOFTWARE\Policies\Google\Chrome\ExtensionInstallForcelist'
  Edge   = 'HKLM:\SOFTWARE\Policies\Microsoft\Edge\ExtensionInstallForcelist'
}

foreach ($browser in $Browsers) {
  $key = $Keys[$browser]
  $found = $false
  if (Test-Path -LiteralPath $key) {
    $item = Get-Item -LiteralPath $key
    foreach ($name in $item.GetValueNames()) {
      $value = [string]$item.GetValue($name)
      if ($value -eq $ExtensionId -or $value.StartsWith("$ExtensionId;")) { $found = $true }
    }
  }
  if (-not $found) { exit 1 }
}

Write-Output "Shadow AI Sentinel policy present for: $($Browsers -join ', ')"
exit 0
