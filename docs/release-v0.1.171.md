# SMSAnalyzer v0.1.171

- Release build of v0.1.170: the APK is no longer debuggable and WebView debugging is off, so the SMS archive cannot be copied with `run-as` and loaded SMS cannot be inspected through Chrome DevTools.
- `android/build.ps1` builds release APKs by default; `-DebugBuild` produces a separate debuggable `-debug.apk` for on-device debugging.
- Includes all v0.1.170 changes: about one-second startup in every case, background refresh after new SMS, indexed merchant lookups and the unencrypted local archive. Analysis results are unchanged.

Installed on Galaxy S25 as an in-place update over v0.1.170 with the existing signing certificate; all 5,349 archived SMS loaded and Home opened in about 0.45 s. No UI changes; screenshots are unchanged. Private SMS, local rules and signing keys are excluded from this repository and release.

Author: Aniruddha DuttaChowdhury · ADChowdhury
