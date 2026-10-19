# SMSAnalyzer v0.1.85

Home now restores validated encrypted analysis before scanning the inbox. The previous large-cache read failed against Android CursorWindow limits and forced reanalysis on every launch; bounded reads fix that failure. Measured cached Home readiness on the connected S25 improved from 3.04 seconds to 0.83 seconds for 4,985 messages. Actual times depend on the device and inbox.

Changes since v0.1.69:

- Unified Travel and Food & Dining category choices, with saved-rule migration and clearer labels.
- Editable bill and flagged SMS using the existing category-review flow and preserved Back paths.
- Category icon/colour editing, compact management tabs, merchant catalogue/icons and consistent themed controls.
- Categories donut with a compact wrapping legend; Home continues to chart expense amounts.
- Calendar-based periods, Calendar Year and April–March Fiscal Year, alongside rolling 7/30 days.
- Visible matching bevel feedback before fast-tap actions, preserved SMS long-press copying and editable text fields.
- Shared readable disclaimer styles, faster initial parsing and indexed self-transfer matching.

Previously completed validation includes browser regressions, native archive/cache tests with a six-megabyte payload, and live S25 cache/full-rebuild equivalence. Original SMS and training remain intact. This publication uses the existing signed v0.1.85 APK; no rebuild or new checks were run for publication.

Author: Aniruddha DuttaChowdhury · ADChowdhury. Package: app.adc.smsanalyzer.
