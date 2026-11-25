# SMSAnalyzer v0.1.172

- Upcoming bills on Home and Alerts use the 🧾 receipt emoji for bills; subscriptions keep the calendar icon.
- Expense trend marks three points on the cumulative budget line: first spend, the day the monthly budget was reached and today. Tap a dot to see its date, cumulative amount and percentage of budget below the chart.
- The "100% budget" label sits at the left of the threshold line so it no longer overlaps late-month spending.
- New **Spend by source** card below Expense trend: a glossy donut of the current month's spend per card or account, with the total in the centre and a legend of amounts and shares.
  - **Gross Spend**: every debit from each source, including EMI, transfers and card-bill payments; self transfers and duplicate alerts are excluded.
  - **Net Spend**: spend as counted on Home, after category exclusions.
  - Sources use saved account names and types where the last four digits match My accounts; other sources show the bank and last four digits, or the bank when no account is stated.

Release build (not debuggable). Installed on Galaxy S25 as an in-place update; Home opened in about 0.5 s and the Net Spend total matched Home's spend. No README screenshots were updated. Private SMS, local rules and signing keys are excluded from this repository and release.

Author: Aniruddha DuttaChowdhury · ADChowdhury
