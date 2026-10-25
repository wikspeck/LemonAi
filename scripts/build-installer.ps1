param([string]$Compiler = "$PSScriptRoot\..\work\tools\inno\ISCC.exe", [string]$Version = "2.2.0")
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
if ($Version -notmatch '^\d+\.\d+\.\d+$') { throw 'Use a three-part numeric release version.' }
$configuration = Get-Content (Join-Path $root 'native\Lemon2.Core\ProductConfiguration.cs') -Raw
if ($configuration -notmatch 'public\s+const\s+string\s+Version\s*=\s*"([0-9.]+)"' -or $Matches[1] -ne $Version) { throw 'Update ProductConfiguration.Version before changing the installer version.' }
[xml]$project = Get-Content (Join-Path $root 'native\Lemon2\Lemon2.csproj') -Raw
if ($project.Project.PropertyGroup.AssemblyVersion -ne "$Version.0") { throw 'Native AssemblyVersion must match the installer version.' }
$publish = Join-Path $root "native\artifacts\$Version\app"
$msbuild = & "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe" -latest -products '*' -requires Microsoft.Component.MSBuild -find 'MSBuild\**\Bin\MSBuild.exe' | Select-Object -First 1
if (-not $msbuild) { throw 'MSBuild with WinUI build prerequisites is required on the release machine.' }
if (-not (Test-Path -LiteralPath $Compiler)) { throw 'Install Inno Setup 6 and pass -Compiler <path to ISCC.exe>.' }
& $msbuild (Join-Path $root 'native\Lemon2\Lemon2.csproj') /restore /t:Publish /p:Configuration=Release /p:Platform=x64 /p:SelfContained=true "/p:PublishDir=$publish\" "/p:Version=$Version" /p:NuGetAudit=false /verbosity:minimal
if ($LASTEXITCODE) { throw 'Native publish failed.' }
foreach ($required in @('Lemon2.exe','coreclr.dll','App.xbf','MainWindow.xbf','MessageView.xbf','CanvasView.xbf','DesignSystem.xbf','Lemon2.pri','Microsoft.ui.xaml.dll','Microsoft.WindowsAppRuntime.dll','Assets\lemon.ico')) {
 if (-not (Test-Path -LiteralPath (Join-Path $publish $required))) { throw "Publish is missing $required" }
}
& $Compiler "/DPublishDir=$publish" "/DReleaseVersion=$Version" (Join-Path $root 'native\installer\Lemon.iss')
if ($LASTEXITCODE) { throw 'Installer compilation failed.' }
$installer = Join-Path $root "native\artifacts\$Version\Lemon-$Version-Setup.exe"
Get-FileHash -LiteralPath $installer -Algorithm SHA256
Write-Output "Installer candidate: $installer. Signing and clean Windows validation are separate release gates."

