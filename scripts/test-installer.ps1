param([string]$Installer = "$PSScriptRoot\..\native\artifacts\2.2.0\Lemon-2.2.0-Setup.exe")
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$installDirectory = Join-Path $env:LOCALAPPDATA 'Programs\Lemon'
$registryPath = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\{6F55E856-6D27-49B7-B451-3455B806C580}_is1'
if ((Test-Path -LiteralPath $installDirectory) -or (Test-Path -LiteralPath $registryPath)) { throw 'Existing Lemon installation detected. Refusing an automatic uninstall test.' }
$historyPath = Join-Path $env:LOCALAPPDATA 'Lemon2\history.json'
$historyBefore = if(Test-Path -LiteralPath $historyPath){(Get-FileHash -LiteralPath $historyPath).Hash}else{$null}
$log = Join-Path $root 'work\install.log'
$process = Start-Process -FilePath (Resolve-Path -LiteralPath $Installer) -ArgumentList @('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/SP-','/LANG=english','/TASKS=desktopicon',"/LOG=`"$log`"") -WindowStyle Hidden -PassThru
if(-not $process.WaitForExit(60000)){throw 'Installer exceeded test timeout'}
if($process.ExitCode){throw "Installer failed: $($process.ExitCode)"}
$menuLink = Join-Path ([Environment]::GetFolderPath('Programs')) 'Lemon\Lemon.lnk'
$desktopLink = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Lemon.lnk'
$shell = New-Object -ComObject WScript.Shell
if(-not(Test-Path -LiteralPath $menuLink)){throw 'Start menu entry missing'}
$shortcut = $shell.CreateShortcut($menuLink)
$exe = Join-Path $installDirectory 'Lemon2.exe'
if($shortcut.TargetPath -ne $exe){throw 'Wrong Start menu target'}
if(-not(Test-Path -LiteralPath $desktopLink)){throw 'Optional desktop shortcut missing'}
$entry = Get-ItemProperty -LiteralPath $registryPath
if($entry.DisplayName -notlike 'Lemon*' -or $entry.DisplayVersion -ne '2.2.0'){throw 'Incorrect uninstall/version metadata'}
Start-Process -FilePath $menuLink -WindowStyle Hidden
Write-Output 'Installed; launched through Start menu shortcut. Inspect the native window before uninstalling.'
[pscustomobject]@{installer=(Resolve-Path -LiteralPath $Installer).Path;installerSha256=(Get-FileHash -LiteralPath $Installer -Algorithm SHA256).Hash.ToLowerInvariant();installed=$true;startMenu=$menuLink;desktop=$desktopLink;target=$shortcut.TargetPath;version=$entry.DisplayVersion;historyHashBefore=$historyBefore;cleanWindows=$false} | ConvertTo-Json | Set-Content (Join-Path $root 'docs\performance\2.2-install-host.json') -Encoding utf8
