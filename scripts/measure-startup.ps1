param([Parameter(Mandatory=$true)][string]$Executable,[Parameter(Mandatory=$true)][string]$Output,[string]$Arguments="")
$resolved=(Resolve-Path -LiteralPath $Executable).Path
$results=@()
for($index=0;$index -lt 4;$index++){
 $watch=[Diagnostics.Stopwatch]::StartNew();$start=@{FilePath=$resolved;WindowStyle="Hidden";PassThru=$true};if($Arguments){$start.ArgumentList=$Arguments};$process=Start-Process @start
 $idle=$process.WaitForInputIdle(15000);$watch.Stop();Start-Sleep -Milliseconds 200;$process.Refresh()
 $results += [pscustomobject]@{launch=$index;firstObservedLaunch=($index -eq 0);inputIdleMs=$watch.Elapsed.TotalMilliseconds;reachedInputIdle=$idle;workingSetBytes=$process.WorkingSet64}
 $process.CloseMainWindow() | Out-Null
 if(-not $process.WaitForExit(5000)){Stop-Process -Id $process.Id}
}
$results | ConvertTo-Json | Set-Content -Encoding utf8 -LiteralPath $Output
$results
