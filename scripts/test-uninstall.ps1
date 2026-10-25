$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$recordPath=Join-Path $root 'docs\performance\2.2-install-host.json'
$record=Get-Content -LiteralPath $recordPath -Raw | ConvertFrom-Json
$expected=Join-Path $env:LOCALAPPDATA 'Programs\Lemon\Lemon2.exe'
if($record.target -ne $expected -or -not $record.installed){throw 'No matching installation test record'}
if(Get-Process Lemon2 -ErrorAction SilentlyContinue){throw 'Close Lemon before the uninstall test'}
$historyPath=Join-Path $env:LOCALAPPDATA 'Lemon2\history.json'
$settingsPath=Join-Path $env:LOCALAPPDATA 'Lemon2\settings.json'
$historyHash=(Get-FileHash -LiteralPath $historyPath).Hash
$settingsHash=(Get-FileHash -LiteralPath $settingsPath).Hash
$record | Add-Member -Force -NotePropertyName testedInstallerSha256 -NotePropertyValue $record.installerSha256
$process=Start-Process -FilePath (Join-Path (Split-Path $expected) 'unins000.exe') -ArgumentList '/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART' -WindowStyle Hidden -PassThru
if(-not $process.WaitForExit(60000)){throw 'Uninstall timeout'}
if($process.ExitCode){throw "Uninstall failed: $($process.ExitCode)"}
$cleanupDeadline=(Get-Date).AddSeconds(5)
while((Test-Path -LiteralPath (Split-Path $expected)) -and (Get-Date) -lt $cleanupDeadline){Start-Sleep -Milliseconds 100}
$registry='HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\{6F55E856-6D27-49B7-B451-3455B806C580}_is1'
foreach($path in @($record.startMenu,$record.desktop,$record.target,$registry)){if(Test-Path -LiteralPath $path){throw "Uninstall left registered item: $path"}}
$preserved=$historyHash -eq (Get-FileHash -LiteralPath $historyPath).Hash -and $settingsHash -eq (Get-FileHash -LiteralPath $settingsPath).Hash
if(-not $preserved){throw 'User data changed during uninstall'}
$record | Add-Member -Force -NotePropertyName uninstallVerified -NotePropertyValue $true
$record | Add-Member -Force -NotePropertyName userDataPreserved -NotePropertyValue $preserved
$record | ConvertTo-Json | Set-Content -LiteralPath $recordPath -Encoding utf8
Write-Output 'Host uninstall passed; shortcuts/registration removed; history and settings unchanged.'
