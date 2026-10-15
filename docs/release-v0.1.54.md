# SMSAnalyzer v0.1.54

Latest Android development/review version by Aniruddha DuttaChowdhury · ADChowdhury.

## In this release

- Top payee period toggle height matches the dropdown, with vertically centred labels.
- Home supports Top payee aggregation or individual Latest payments. Latest payments hides the period toggle and preserves the prior Top payee selection.
- Matching dropdown style across Home and Settings, with outside-tap dismissal.
- Deep red previous-period amount for readability, compact payee controls and existing Wood/Stone/Brick themes.
- Persistent encrypted local SMS archive, fast unchanged refreshes, related-message learning and long-press SMS copying.

Eight screenshots are mapped to their screens in the repository README. They show the real interface with synthetic sample SMS; no personal inbox or training export is included.

## Install and identity

Package: app.adc.smsanalyzer · versionCode: 55 · Android 8.0/API 26 or newer.

Install smsanalyzer-v0.1.54.apk. The APK preserves the existing signing certificate. A custom source build signed with a different key cannot update this installation in place. This is the current development/review build.

## Verification

Android build/signature verification passed and the APK was installed on Galaxy S25. Dropdown and toggle height/alignment match at 320, 360 and 393px widths. Recent functional checks cover payment lists, date fallback, deduplication, category navigation, learning, archive retention/encryption and clipboard behavior. Screenshot capture completed without page errors.

Financial interpretation remains heuristic. Latest payments labels SMS received-time fallback when no supported transaction date is found. Archive retention is local and does not survive uninstall or clearing app data.

Release assets include the existing APK, a clean source snapshot, screenshot pack and SHA-256 checksums. Keys, personal data and build intermediates are excluded.
