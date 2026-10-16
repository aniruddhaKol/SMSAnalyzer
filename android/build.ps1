$ErrorActionPreference = 'Stop'
# Author: Aniruddha DuttaChowdhury · ADChowdhury
$sdkTask = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$buildToolsTask = Join-Path $sdkTask 'build-tools\36.0.0'
$jdkTask = 'C:\jdk-27'
$env:JAVA_HOME = $jdkTask
$env:SKIP_JDK_VERSION_CHECK = '1'
$env:JAVA_OPTS = '--enable-native-access=ALL-UNNAMED'
function CheckBuild([string]$step) { if ($LASTEXITCODE -ne 0) { throw "$step failed ($LASTEXITCODE)" } }
Push-Location $PSScriptRoot
try {
 Copy-Item -Path (Join-Path $PSScriptRoot '..\ui\*') -Destination (Join-Path $PSScriptRoot 'assets\ui') -Recurse -Force
 New-Item -ItemType Directory -Force -Path work\classes,work\dex,signing,releases\v0.1.67 | Out-Null
 if (!(Test-Path -LiteralPath 'signing\smsanalyzer-review.keystore')) {
  & "$jdkTask\bin\keytool.exe" -genkeypair -keystore 'signing\smsanalyzer-review.keystore' -alias smsanalyzer-review -keyalg RSA -keysize 2048 -validity 10000 -storepass android -keypass android -dname 'CN=Aniruddha DuttaChowdhury, OU=ADChowdhury, O=ADChowdhury, C=IN'
  CheckBuild 'Create review signing key'
 }
 & "$buildToolsTask\aapt.exe" package -f -m -M AndroidManifest.xml -I "$sdkTask\platforms\android-36\android.jar" -S res -J src
 CheckBuild 'Generate resources'
 & "$jdkTask\bin\javac.exe" --release 8 -classpath "$sdkTask\platforms\android-36\android.jar" -d work\classes (Get-ChildItem -LiteralPath src -Recurse -Filter '*.java' | ForEach-Object FullName)
 CheckBuild 'Compile Java'
 & "$buildToolsTask\d8.bat" --lib "$sdkTask\platforms\android-36\android.jar" --min-api 26 --output work\dex (Get-ChildItem -LiteralPath work\classes -Recurse -Filter '*.class' | ForEach-Object FullName)
 CheckBuild 'Compile DEX'
 & "$buildToolsTask\aapt.exe" package -f -M AndroidManifest.xml -I "$sdkTask\platforms\android-36\android.jar" -S res -A assets -F work\unsigned.apk
 CheckBuild 'Package APK'
 Push-Location work\dex
 try { & "$buildToolsTask\aapt.exe" add -f '..\unsigned.apk' classes.dex; CheckBuild 'Add DEX' } finally { Pop-Location }
 & "$buildToolsTask\zipalign.exe" -f -p 4 work\unsigned.apk work\aligned.apk
 CheckBuild 'Align APK'
 & "$buildToolsTask\apksigner.bat" sign --ks signing\smsanalyzer-review.keystore --ks-key-alias smsanalyzer-review --ks-pass pass:android --key-pass pass:android --out releases\v0.1.67\smsanalyzer-v0.1.67.apk work\aligned.apk
 CheckBuild 'Sign APK'
 & "$buildToolsTask\apksigner.bat" verify --verbose --print-certs releases\v0.1.67\smsanalyzer-v0.1.67.apk
 CheckBuild 'Verify APK'
} finally { Pop-Location }










