param([string]$BaselineRef='666a434',[ValidateSet(1,3,5)][int]$Rounds=3)
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root
$baseline=Join-Path $root 'work\render-baseline'
New-Item -ItemType Directory (Join-Path $root 'work') -Force | Out-Null
git archive --format=zip --output=work/render-baseline.zip $BaselineRef native
if($LASTEXITCODE){throw 'Cannot archive baseline ref'}
Expand-Archive -LiteralPath work/render-baseline.zip -DestinationPath $baseline -Force
$benchmark=Get-Content native/Lemon2/RenderBenchmarkWindow.cs -Raw
$benchmark.Replace('message.IsStreaming=true; ','') | Set-Content (Join-Path $baseline 'native\Lemon2\RenderBenchmarkWindow.cs') -Encoding utf8
$app=Join-Path $baseline 'native\Lemon2\App.xaml.cs'
$source=Get-Content -LiteralPath $app -Raw
if(-not $source.Contains('new MainWindow()')){throw 'Unexpected baseline launch architecture'}
$source.Replace('new MainWindow()','new RenderBenchmarkWindow()') | Set-Content -LiteralPath $app -Encoding utf8
$msbuild=& "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe" -latest -products '*' -requires Microsoft.Component.MSBuild -find 'MSBuild\**\Bin\MSBuild.exe' | Select-Object -First 1
& $msbuild (Join-Path $baseline 'native\Lemon2\Lemon2.csproj') /restore /t:Publish /p:Configuration=Release /p:Platform=x64 /p:SelfContained=true "/p:PublishDir=$baseline\app\" /p:NuGetAudit=false /verbosity:minimal
if($LASTEXITCODE){throw 'Baseline publish failed'}
$updated=Join-Path $root 'native\artifacts\2.2.0\app\Lemon2.exe'
if(-not(Test-Path -LiteralPath $updated)){throw 'Build the current self-contained candidate first'}
 $previousOutput=$env:LEMON_BENCHMARK_OUTPUT
try {
 for($round=1;$round -le $Rounds;$round++){
  foreach($sample in @(@{version='2.1';exe=(Join-Path $baseline 'app\Lemon2.exe')},@{version='2.2';exe=$updated})){
   $env:LEMON_BENCHMARK_OUTPUT=Join-Path $root "docs\performance\$($sample.version)-ui-recheck-$round.json"
   $process=Start-Process -FilePath $sample.exe -ArgumentList '--benchmark' -WindowStyle Hidden -PassThru
   if(-not $process.WaitForExit(30000)){Stop-Process -Id $process.Id;throw 'Benchmark timeout'}
   if($process.ExitCode -or -not(Test-Path -LiteralPath $env:LEMON_BENCHMARK_OUTPUT)){throw 'Benchmark failed'}
  }
 }
 foreach($version in @('2.1','2.2')){
  $samples=1..$Rounds | ForEach-Object {Get-Content "docs/performance/$version-ui-recheck-$_.json" -Raw | ConvertFrom-Json}
  $summary=$samples | Group-Object metric | ForEach-Object {$values=@($_.Group.value|Sort-Object);[pscustomobject]@{metric=$_.Name;value=$values[[int][Math]::Floor($values.Count/2)];minimum=$values[0];maximum=$values[-1];samples=$Rounds}}
  $summary | ConvertTo-Json | Set-Content "docs/performance/$version-ui-recheck.json" -Encoding utf8
 }
} finally { if($null -eq $previousOutput){Remove-Item Env:\LEMON_BENCHMARK_OUTPUT -ErrorAction SilentlyContinue}else{$env:LEMON_BENCHMARK_OUTPUT=$previousOutput} }
