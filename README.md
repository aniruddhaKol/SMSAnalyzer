# SMSAnalyzer

Android SMS insights and local learning by **Aniruddha DuttaChowdhury** · **ADChowdhury**.

**Latest source version:** 0.1.121 · **Application ID:** `app.adc.smsanalyzer`

[Latest published APK](https://github.com/aniruddhaKol/SMSAnalyzer/releases/latest) · [Published v0.1.121 release notes](docs/release-v0.1.121.md) · [Screenshot details](docs/SCREENSHOTS.md)

Latest changes are described in [the v0.1.121 release notes](docs/release-v0.1.121.md).

SMSAnalyzer reads permitted inbox messages on the device, identifies payments and credits, groups spending, and lets you correct classifications through a Learning Centre. The interface follows the TaskVilla Wood, Stone, Brick and BookShelves themes.

## Screenshots

These are actual v0.1.66 interface renders with **synthetic sample SMS**, not a real inbox. Native Android system bars are not included. Select an image to see it at full resolution.

| Home overview · Wood | Top payee · Stone |
| --- | --- |
| <img src="docs/screenshots/home.png" alt="Home spending overview and monthly budget in the Wood theme" width="300"> | <img src="docs/screenshots/top-payee.png" alt="Aggregated Top payee list with matching-height dropdown and period toggle" width="300"> |

| Latest payments · Stone | Categories · Brick |
| --- | --- |
| <img src="docs/screenshots/latest-payments.png" alt="Individual outgoing payments ordered by transaction date, with the period toggle hidden" width="300"> | <img src="docs/screenshots/categories.png" alt="Category tags and debit and credit totals in the Brick theme" width="300"> |

| Trends · Wood | Alerts · Brick |
| --- | --- |
| <img src="docs/screenshots/trends.png" alt="Spending trends and weekday averages" width="300"> | <img src="docs/screenshots/alerts.png" alt="Bill and message alerts" width="300"> |

| Settings · Stone | Learning Centre · Wood |
| --- | --- |
| <img src="docs/screenshots/settings.png" alt="Settings with default period, monthly budget, themes and training entry" width="300"> | <img src="docs/screenshots/learning-centre.png" alt="Learning progress and compact review and management controls" width="300"> |

## Features

- Home spending and credit summaries, previous-period comparison and monthly budget. Categories can be excluded from spending and the monthly budget; EMI and Transfers are excluded by default.
- **Top payee** aggregates identified recipients for All time or the selected period. **Latest payments** shows individual outgoing payments, newest first, with five more records per Load more action. Its period toggle is hidden; returning to Top payee restores the previous selection.
- Latest payments uses an extracted transaction date/time when supported and labels SMS received-time fallback. Existing duplicate and payment-treatment rules exclude duplicate notices, internal movements and non-payments.
- Category amounts, source SMS previews, spending trends, bill/OTP/spam estimates and bank/merchant icons.
- Learning Centre under Settings: correct recipients, categories, income and self-transfers; preview historical matches; save reusable rules or individual corrections; undo saved corrections; add custom categories.
- Owned accounts can be saved with account types and aliases, or detected from repeated source-account transaction evidence. Internal transfers between verified owned accounts are excluded from both spending and income; uncertain transfers remain Others.
- An offline catalogue includes 1,520 institution entries, including historical names. Official logos are bundled where retrieved; other entries use neutral bank symbols. Bank and account-type selectors are alphabetically sorted.
- Bills due includes detected upcoming dates beyond the current week and opens the original SMS. Home notice cards use painted icon edges and number glyph bounds for optical alignment.
- Conservative multipart reconstruction and related-message learning. Separate messages are not merged merely because they arrive together.
- Pull to refresh; long-press displayed SMS content to copy the full message. Dropdowns dismiss on outside taps. Buttons show a matching pressed bevel before activation.
- Categories uses a donut for SMS category-tag shares; Home uses expense amounts. Unified Travel and Food & Dining choices preserve existing corrections.
- Learning management provides Recipients, My accounts, Rules and Categories tabs. Custom categories support names, emoji and colours; default names remain fixed. Bill and flagged-SMS lists reuse category review/editing.
- Encrypted analysis caching restores Home before background inbox scanning. Large cache payloads are read in bounded chunks to avoid Android SQLite cursor limits.

## Data and privacy

The Android shell requests **READ_SMS**. It does not request Internet or SMS-send permissions. Original imported SMS payloads are retained in an encrypted local SQLite archive using an Android Keystore key; analysis and learning remain on the device. Refresh adds records without purging messages removed from the inbox. There is no automatic archive expiry.

Import runs on app open and pull to refresh. Messages deleted before their first import cannot be recovered. Uninstalling or clearing app data removes the local archive and key. The UI has no archive/export block; an export is performed only following an explicit request outside the app. Personal inboxes, learned recipient data, archives and signing keys are not included in this repository or release assets.

SMS interpretation is heuristic: unsupported wording, unclear ownership, transaction-date formats and overlapping alerts can affect results. The app keeps originals available for review. It does not send or delete inbox SMS.

## Install

The current source and latest published APK are v0.1.85. This release fixes large analysis-cache reads and restores cached Home data before background inbox scanning. It also includes unified category choices, editable bill/spam SMS, category appearance controls, the Categories donut and consistent themed controls.

Download `smsanalyzer-v0.1.85.apk` from the [release](https://github.com/aniruddhaKol/SMSAnalyzer/releases/tag/v0.1.85), install it on Android 8.0/API 26 or newer, then grant SMS access when requested. Pull down on Home to refresh. Google Play Protect may block browser-downloaded APKs requesting SMS access; a valid signature does not guarantee installation approval.

This is the current development/review build. The released APK retains the existing signing identity for compatible updates. A locally rebuilt APK signed with a different key cannot replace that installation as an in-place update.

## Source layout

| Path | Purpose |
| --- | --- |
| `ui/` | HTML/CSS/JavaScript interface, classification, learning and assets |
| `android/src/` | Java WebView shell and encrypted SQLite archive |
| `android/res/` | Android resources and launcher artwork |
| `android/build.ps1` | Build, align and sign the APK; copies `ui/` into Android assets |
| `docs/screenshots/` | Eight synthetic-data screenshots embedded above |
| `scripts/` | Reproducible screenshot capture |

## Build

Requires Windows PowerShell, Android SDK platform 36/build-tools 36.0.0 and JDK 27 (the existing script uses `C:/jdk-27`). The SDK defaults to `%LOCALAPPDATA%/Android/Sdk`.

```powershell
./android/build.ps1
```

The script uses the existing local review keystore when present and generates a new local review key when it is absent. Signing files are ignored by Git. Keep the original key privately if producing updates for existing installations; generating another key changes signature compatibility. Output is written under `android/releases/v0.1.85/`.

## Reproduce screenshots

Install Node.js, Playwright and Microsoft Edge, then run:

```powershell
npm install --no-save playwright
node scripts/capture-screenshots.cjs
```

Use `SCREENSHOT_BROWSER` to choose another installed Playwright Chromium channel. The script generates synthetic messages only; it never connects to a phone.

## Validation

The Android v0.1.66 build was installed on Galaxy S25 with the existing package and signing certificate. Live checks confirmed account editing/removal, saved-rule preservation, alphabetical selectors and upcoming-bill SMS previews. The notice-card alignment was checked against native screenshot pixels, including the visible SVG stroke and number glyphs. Device captures and inboxes are private and excluded from this repository.

With Node.js, Playwright and Microsoft Edge available, run:

```powershell
node scripts/verify-ui.cjs
node scripts/verify-category-replacement.cjs
node scripts/verify-payee-preview.cjs
node scripts/verify-owned-transfers.cjs
node scripts/verify-bank-accounts.cjs
node scripts/verify-overview-alerts.cjs
```

These synthetic regressions cover dropdown dismissal and period restoration, newest-category precedence and undo, fixed preview actions, ownership and duplicate guards, compact controls, account detection and removal confirmation, sorted selectors, upcoming dates and SMS pagination. Earlier archive/encryption and native clipboard checks are documented in the [historical version guide](docs/v0.1.54-guide.md).

## Attribution

Roboto Mono is included under the [SIL Open Font License](ui/assets/fonts/RobotoMono-OFL.txt). Bank and merchant marks identify transaction sources; they belong to their respective owners and do not imply endorsement. See [artwork attribution](ui/assets/brands/ATTRIBUTION.txt) and [retrieved sources](ui/assets/brands/sources.json). Bank directory data is from Razorpay IFSC under its [MIT licence](ui/assets/banks/IFSC-LICENSE.txt), supplemented with RBI directory names. See [bank catalogue/artwork provenance](ui/assets/banks/SOURCES.json) and [bank artwork attribution](ui/assets/banks/ATTRIBUTION.txt). TaskVilla-style themes and the ADChowdhury signature are reused at the author's direction.


## License

Copyright © 2026 Aniruddha DuttaChowdhury.

Original project material is licensed under the **PolyForm Noncommercial License 1.0.0**. Personal, academic, research, educational and other qualifying noncommercial uses, modifications and redistribution are permitted in accordance with its terms. Commercial uses outside those permissions require separate authorization from the copyright holder.

Anyone redistributing covered software, including within another application, must pass along the license terms or their URL and all applicable Required Notices identifying the original author, project and source repository. This license does not require publication of the modified application's source code.

For complete terms, see [LICENSE.md](LICENSE.md). Third-party software, libraries, fonts, data and artwork remain subject to their respective licenses; see [third-party notices and unresolved permissions](THIRD-PARTY-NOTICES.md).

### Redistribution attribution example

For an application derived from `SMSAnalyzer`, accompany the distributed software with the license terms or their URL and these notices, for example in licensing documents or an attribution file:

```text
Based on: SMSAnalyzer
Required Notice: Copyright © 2026 Aniruddha DuttaChowdhury.
Required Notice: Original Author: Aniruddha DuttaChowdhury.
Required Notice: Original Project: SMSAnalyzer.
Required Notice: Original Source: https://github.com/aniruddhaKol/SMSAnalyzer
License: PolyForm Noncommercial License 1.0.0
License terms: https://polyformproject.org/licenses/noncommercial/1.0.0
```

An About screen acknowledgment is encouraged. The standard license does not impose separate app-store attribution or UI-branding requirements, or require public disclosure of modified source code.
