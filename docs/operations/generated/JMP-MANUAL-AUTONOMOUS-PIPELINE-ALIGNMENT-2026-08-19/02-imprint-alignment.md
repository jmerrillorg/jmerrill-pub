# Imprint Alignment

## Does missing confirmed imprint currently block Editorial Review?
**NO.** The hard-stop language ("Do NOT proceed with full review") exists only in the manual GPT text (`01-Editorial-Review/instructions.md` L12-19). The actual runtime prompt-assembly/gating code (`manuscriptEditorialReviewProvider.js`, `editorialPromptAssembly.js`) contains no such block. `preContractEditorialReviewGate.js`'s `imprintReady` check already accepts `imprintLocked || imprintRecommended || imprintOverridden` — a mere recommendation is sufficient.

## What happens when no confirmed imprint exists?
Currently: Editorial Review can proceed, but `editorialGuideSelector.js` only takes a flat `input.imprint` value — it does not yet explicitly resolve "confirmed-else-suggested" or label which one is in use. **PARTIAL** — proceeds correctly, but doesn't yet produce the clear confirmed-vs-suggested labeling the Founder canon asks for.

## What if suggested imprint is JM Signature?
No auto-assignment path was found anywhere. Schema (`jm1pub_classificationstatus` picklist: Unclassified/Auto-Assigned/Human Review/Confirmed/Overridden/Processing) already supports representing "JM Signature suggested, not yet Confirmed" precisely. No runtime code was found that flips a title to Confirmed+JM Signature without a human action.

## Schema mapping (existing fields, no new schema needed)
| Concept | Existing Dataverse field |
|---|---|
| confirmedImprint | `jm1pub_certifiedimprint` |
| suggestedImprint | `jm1pub_imprint` |
| imprintStatus | `jm1pub_classificationstatus` (Unclassified=0/Auto-Assigned=1/Human Review=2/Confirmed=3/Overridden=4/Processing=5) |
| JM Signature value | `196650004` on the imprint picklist |

## Verdict
Runtime is already essentially aligned with Founder canon. **The manual GPT text is what's out of date** and should be corrected (P1, doc-only). The one real runtime gap is explicit confirmed-vs-suggested resolution/labeling in the Editorial Review feed path (P1, small).
