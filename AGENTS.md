# SMSAnalyzer conventions

Root: C:\workspace\SMSAnalyzer. Package and Java namespace: app.adc.smsanalyzer. Author: Aniruddha DuttaChowdhury. Brand: ADChowdhury.

Preserve original mockup, versioned release folders and android/signing/smsanalyzer-review.keystore. Keep TaskVilla-style theme and icon sizing. UI preview source is ui/; synchronize android/assets/ui before building. Run emulator checks headlessly. Do not send or delete SMS. Demo must always be explicitly labelled and separate from real inbox data. Preserve font attribution and licence notices.

## Button layout preference

Keep related action buttons on the same horizontal row wherever their labels and comfortable tap targets fit. Use a flex/grid action row with consistent gaps and aligned heights; wrap or stack only when narrow widths or long labels require it. Give action controls visible TaskVilla bevel styling and pressed feedback. For example, the budget popup uses Save and Remove side by side. Dialog dismissal uses the centred header cross; do not add a redundant Close/Cancel footer.

Keep primary actions on the right and secondary actions on the left throughout my apps, including dialogs. Use the same ordering in the markup so keyboard navigation agrees with the visual layout. When a row wraps or stacks, secondary comes first and primary follows. A lone primary or destructive confirmation action aligns to the right. For example, Remove is left and Save is right in the budget popup.

Do not use right-pointing arrows, right chevrons or greater-than navigation icons in my application interfaces unless I explicitly request them. Use clear labels or the control itself to convey its action. This preference does not remove left-facing Back controls or downward dropdown indicators.

## Focus borders

Keep the complete keyboard/input focus indicator visible on all four sides. In clipped or scrollable containers, use an inset outline (negative outline-offset) or inset focus ring, and give form rows enough internal padding. Do not put an outward focus ring on an edge-to-edge control inside overflow:hidden/auto. Check the first and last controls at narrow widths, with the keyboard open and at scroll boundaries; fixing only one named field is insufficient.
Learning Centre is a second page under Settings. Keep only Home, Categories, Trends and Alerts in the bottom bar.

Training must support self-transfer and non-transaction SMS without a named recipient. Generate an editable SMS-format pattern; allow explicit non-transaction sender rules for government/delivery notices. Preserve the selected category, preview matches and retain undo. Keep top and bottom Skip on one shared visual/pressed variant. The Train SMSAnalyzer illustration stays on a white background without theme filters.

Learning progress and review queues must share one status calculation over all loaded SMS. Recognised topic tags and saved reviews belong under Identified, with an explicit correction path. Selected historical rule matches remain reviewed across reloads; exclusions and undo remain effective. Skipping does not mark an SMS reviewed. Keep the Learning Centre entry controls to the actionable counters and Review SMS, without separate search/reload controls.

Recognise completed transfer alerts with the amount before “sent from … A/c”, including multiline text. Test that a newly generated rule matches its own example before proceeding. Confirmed self-transfers are excluded from both expense and income totals, while original detected amounts remain available in review and Transfers. Top payee category actions must preview all-history changes, preserve self-transfer treatment and offer undo.

Investment contribution/allotment confirmations and provider payment receipts are not cash income merely because they say “credited” or “received”. Distinguish completed bank transactions from pending requests, loan processing, valuations and notices. Strip URLs before interpreting finance keywords such as NPS. Unchecking Remember this pattern saves only an undoable individual SMS correction, outside reusable rules, with no historical/future propagation. Review choices use alternating backgrounds and a separate selected state without divider lines.

Category tiles open their identified SMS for the selected period. Keep category-list and Learning Centre review origins separate, including list pagination and scroll position; Back and completed corrections return to the originating list. Payee previews must be available before choosing a category, show complete SMS with pagination, and disable Apply until a valid category is chosen. Use the shared disclaimer box/icon for correction-scope and original-SMS guidance.

Keep imported originals in the encrypted local SQLite archive without automatic deletion or expiry. Inbox refresh must never remove archived originals. Export personal SMS/training only after an explicit chat request; do not add an in-app export control; exclude private packs, databases and signing keys from shared artifacts. Explain that imports run on open/refresh and cannot recover messages deleted before import or survive app-data deletion/uninstall.

Never merge messages solely because they arrived together. Reassemble only complete, explicit, unambiguous numbered parts, retaining originals. Link other messages by concrete event identifiers and require explicit selection before learning additional formats; preserve each example's sender, direction and account constraints. Long-press displayed SMS copies the complete original content, with movement/scroll cancellation and no interception of controls.



Home Latest payments is a view within the existing payee section, not a new page. Keep Top payee scope/range when switching, hide the period toggle controls in Latest payments, and reuse parsed outgoing/duplicate flags. Label SMS received-time fallback when no transaction date can be extracted. Do not restore the removed SMS archive Settings block.

Keep the Home payee dropdown and period toggle on one row using compact padding. All custom dropdowns must dismiss on outside taps, including when another dropdown opens; native selects keep platform dismissal. Preserve option selection and keyboard Escape behavior.
