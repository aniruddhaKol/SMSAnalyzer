$ErrorActionPreference='Stop'
$taskRoot=Split-Path $PSScriptRoot -Parent
$taskSdk=Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$taskTools=Join-Path $taskSdk 'build-tools\36.0.0'
$taskChecks=Join-Path $taskRoot 'work\archive-checks'
New-Item -ItemType Directory -Force -Path $taskChecks,(Join-Path $taskChecks 'classes'),(Join-Path $taskChecks 'dex'),(Join-Path $taskChecks 'res') | Out-Null
'<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="app.adc.smsanalyzer.archivechecks"><uses-sdk android:minSdkVersion="26" android:targetSdkVersion="34"/><application android:label="Archive checks"/><instrumentation android:name="app.adc.smsanalyzer.ArchiveChecks" android:targetPackage="app.adc.smsanalyzer"/></manifest>' | Set-Content (Join-Path $taskChecks 'AndroidManifest.xml')
& 'C:\jdk-27\bin\javac.exe' --release 8 -classpath "$taskSdk\platforms\android-36\android.jar;$taskRoot\android\work\classes" -d "$taskChecks\classes" "$taskRoot\scripts\ArchiveChecks.java"
if($LASTEXITCODE -ne 0){throw 'Compile archive checks failed'}
& "$taskTools\d8.bat" --lib "$taskSdk\platforms\android-36\android.jar" --min-api 26 --output "$taskChecks\dex" (Get-ChildItem "$taskChecks\classes" -Recurse -Filter '*.class' | ForEach-Object FullName)
& "$taskTools\aapt.exe" package -f -M "$taskChecks\AndroidManifest.xml" -I "$taskSdk\platforms\android-36\android.jar" -S "$taskChecks\res" -F "$taskChecks\unsigned.apk"
Push-Location "$taskChecks\dex"
try{& "$taskTools\aapt.exe" add -f '..\unsigned.apk' classes.dex}finally{Pop-Location}
& "$taskTools\zipalign.exe" -f -p 4 "$taskChecks\unsigned.apk" "$taskChecks\aligned.apk"
& "$taskTools\apksigner.bat" sign --ks "$taskRoot\android\signing\smsanalyzer-review.keystore" --ks-key-alias smsanalyzer-review --ks-pass pass:android --key-pass pass:android --out "$taskChecks\archive-checks.apk" "$taskChecks\aligned.apk"
if($LASTEXITCODE -ne 0){throw 'Archive checks signing failed'}
