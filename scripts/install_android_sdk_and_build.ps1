# Install Android command-line tools and required packages, then build APK
$ErrorActionPreference = 'Stop'
$SdkPath = 'C:\Users\naman\AppData\Local\Android\Sdk'
Write-Output "SDK path: $SdkPath"
if (-not (Test-Path $SdkPath)) { New-Item -ItemType Directory -Force -Path $SdkPath | Out-Null }
$zip = Join-Path $env:TEMP 'cmdline-tools.zip'
$urls = @(
    'https://dl.google.com/android/repository/commandlinetools-win-9477386_latest.zip',
    'https://dl.google.com/android/repository/commandlinetools-win-9123335_latest.zip',
    'https://dl.google.com/android/repository/commandlinetools-win-8512546_latest.zip'
)
$downloaded = $false
foreach ($u in $urls) {
    try {
        Write-Output "Trying to download: $u"
        Invoke-WebRequest -Uri $u -OutFile $zip -UseBasicParsing -TimeoutSec 300
        $downloaded = $true; break
    } catch {
        Write-Output ("Download failed for " + $u + ": " + $_.ToString())
    }
}
if (-not $downloaded) { Write-Error 'Failed to download command-line tools; aborting.'; exit 2 }
$dest = Join-Path $SdkPath 'cmdline-tools\latest'
if (Test-Path $dest) { Remove-Item -Recurse -Force $dest }
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Write-Output "Extracting to $dest"
Expand-Archive -Path $zip -DestinationPath $env:TEMP -Force
$extractedRoot = Get-ChildItem -Directory $env:TEMP | Where-Object { $_.Name -match 'cmdline-tools' } | Select-Object -First 1
if ($extractedRoot) {
    Copy-Item -Path (Join-Path $extractedRoot.FullName '*') -Destination $dest -Recurse -Force
} else {
    Expand-Archive -Path $zip -DestinationPath $dest -Force
}
Remove-Item -Force $zip -ErrorAction SilentlyContinue
if ($extractedRoot) { Remove-Item -Recurse -Force $extractedRoot.FullName -ErrorAction SilentlyContinue }
$sdkmanager = Join-Path $dest 'bin\sdkmanager.bat'
if (-not (Test-Path $sdkmanager)) { Write-Error 'sdkmanager not found after extraction'; exit 3 }
Write-Output "sdkmanager found at $sdkmanager"
# Install required packages
& $sdkmanager --sdk_root="$SdkPath" --install "platform-tools" "platforms;android-33" "build-tools;33.0.2" "cmdline-tools;latest" | ForEach-Object { Write-Output $_ }
Write-Output 'Accepting licenses'
& $sdkmanager --sdk_root="$SdkPath" --licenses | ForEach-Object { Write-Output $_ }
if (Test-Path (Join-Path $SdkPath 'platforms')) { Write-Output 'Platforms installed.' } else { Write-Error 'Platforms folder still missing.'; exit 4 }
cd 'C:\Program Files\Projects\MUSIC\my-music-app\frontend'
Write-Output 'Running npx cap sync android'
npx cap sync android | ForEach-Object { Write-Output $_ }
cd android
Write-Output 'Running gradle assembleDebug'
.\gradlew.bat assembleDebug --stacktrace | ForEach-Object { Write-Output $_ }
Write-Output 'DONE'
