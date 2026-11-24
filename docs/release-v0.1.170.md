# SMSAnalyzer v0.1.170

- Startup is fast in every case. On a Galaxy S25 with about 5,300 SMS, Home opens in about 0.9 s with a saved analysis, about 1.1 s after new SMS or a catalogue change (previously up to 78 s), and about 1.2 s with no saved analysis.
- Merchant and payee lookups are indexed once per catalogue load and reused, instead of scanning every merchant alias for every SMS and learning rule. A full analysis of about 5,300 SMS dropped from about 46–63 s to about 1.4 s. Results are identical.
- When new SMS, rules or catalogue rows arrive, Home shows the saved analysis at once, reads only the SMS missing from it and refreshes in the background.
- The SMS archive and saved analysis are stored as plain JSON in the app's private storage instead of being encrypted per message with an Android Keystore key. Inbox SMS are already readable by any app with SMS permission, and per-message Keystore decryption took about 13 s on every full load. Existing encrypted rows are converted once in the background after upgrading; nothing is deleted.
- The saved analysis records its analysis version, so the first launch after upgrading rebuilds it once.
- Fixed a startup script error when the page was not yet ready for the viewport height.
- The Privacy page no longer describes the archive as encrypted.

Validated on Galaxy S25 as an in-place update with the existing signing certificate. A full re-analysis produced output identical to v0.1.168 for every record, and every converted SMS matched its original fingerprint. No UI changes; screenshots are unchanged. Private SMS, local rules and signing keys are excluded from this repository and release.

Author: Aniruddha DuttaChowdhury · ADChowdhury
