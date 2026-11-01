# SMSAnalyzer v0.1.136

- Home previous-period dates use calendar pills with the supplied wooden separator.
- The third Trends chart shares the selected six-week/six-month/five-year duration and omits its disclaimer.
- Distinguish actual OTP codes from security warnings that merely mention OTP; preserve login, payment and service-code formats.
- Recognise card-payment acknowledgements as settlements rather than income. Match uniquely supported issuer receipts to bank debits without treating every payment to a card/travel brand as a settlement.
- Alerts no longer shows Bills & notices or its period selector. Suspicious messages retain the selected duration; upcoming bills use all loaded SMS, consistently with Home.
- Reconcile bills with full matching card-payment acknowledgements. Preserve partial dues unless the user explicitly confirms that specific bill cycle is settled; confirmations and personal classification rules stay local.
- Previous-period comparison continues to apply the same category, transfer, settlement and duplicate exclusions as current spending.

Published the existing signed v0.1.136 APK installed on the phone. No rebuild or tests were run for this publication. Private SMS, local rules and settlement confirmations are excluded from this repository and release.

Author: Aniruddha DuttaChowdhury · ADChowdhury
