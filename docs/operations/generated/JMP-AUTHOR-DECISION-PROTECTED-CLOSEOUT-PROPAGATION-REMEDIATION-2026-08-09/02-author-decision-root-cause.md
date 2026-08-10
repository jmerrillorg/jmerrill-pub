# Author Decision Root Cause

Last verified: 2026-08-10T02:46:15Z

Root cause: LEGACY_MANUAL_PATH_GAP plus STATE_PROJECTION_GAP.

The real author reply was present in the Publishing shared mailbox and contained the allowed response `Approved`, but the original path did not project that correlated reply into the canonical author-decision fields on the approval gate.

| Question | Answer |
| --- | --- |
| Ingestion gap? | Partially; the evidence existed but was not consumed by the closeout evidence path |
| Correlation gap? | YES for the original live state |
| Decision parsing gap? | NO for the literal reply; `Approved` is unambiguous |
| Decision persistence gap? | YES for the original live state |
| State projection gap? | YES |
| Legacy/manual path gap? | YES |

