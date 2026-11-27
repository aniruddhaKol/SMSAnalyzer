# SMSAnalyzer v0.2.0

- **Card detection:** credit and debit cards are added to My accounts from repeated spend alerts on different days (for example "Spent … using … Credit Card no. XX1234 … Avl limit"). Spend by source labels them as Credit card or Debit card. Cards never take part in own-transfer matching, so card-bill payments keep their existing treatment and totals are unchanged.
- **Your name:** the app suggests your name from greetings in identity SMS (Aadhaar, CKYC, Income Tax, EPFO) on the Accounts tab of Learning Centre and in the account editor. It is saved to "Your name variants" only when you tap **Use this name** or save the editor; **Dismiss** hides it.
- **Account editor:** Back no longer asks to save changes when nothing was changed. Each editor now records its own starting values instead of reusing those of the first editor opened.
- **Help manual:** rewritten around automatic detection, the budget, Spend by source, privacy and troubleshooting, using the existing section and table style.
- **Versioning:** versions now run 0.x.0 to 0.x.49, then move to the next minor version.

Release build (not debuggable). Installed on Galaxy S25 as an update over v0.1.173; Home opened in about 0.47 s. On an emulator with about 5,200 SMS, all spend, credit, self-transfer and card-settlement totals were identical before and after card detection. README screenshots are unchanged. Private SMS, local rules and signing keys are excluded from this repository and release.

Author: Aniruddha DuttaChowdhury · ADChowdhury
