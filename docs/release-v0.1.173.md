# SMSAnalyzer v0.1.173

- Expense trend axis labels stay readable when spending is far over budget. Labels use 25% steps up to 150%, then 50%, 100% or larger steps, so the axis never shows more than six intervals. Previously a month at about 380% of budget drew 17 overlapping labels.
- The "100% budget" label is placed on the side away from the day the budget was crossed, so it never covers that marker.

Release build (not debuggable). Installed on Galaxy S25 as an in-place update; Home opened in about 0.4 s. Axis spacing was checked with synthetic data at about 114% and 380% of budget. README screenshots are unchanged. Private SMS, local rules and signing keys are excluded from this repository and release.

Author: Aniruddha DuttaChowdhury · ADChowdhury
