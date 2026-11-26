# SMSAnalyzer v0.1.174

- A bank/merchant catalogue downloaded while the inbox is loading is applied before the background analysis starts, so one full analysis covers both the new SMS and the updated catalogue. Previously the app analysed with the old catalogue first and then again with the new one.
- If the catalogue arrives after the analysis has started, it still gets its own refresh afterwards, as before. Results are unchanged; only the extra pass is removed.

Measured on an Android 16 emulator with about 4,900 SMS and a catalogue update of 218 merchants: one re-analysis instead of two, and the time from Home appearing to updated merchants dropped from about 4.4 s to 3.3 s. Release build (not debuggable). README screenshots are unchanged. Private SMS, local rules and signing keys are excluded from this repository and release.

Author: Aniruddha DuttaChowdhury · ADChowdhury
