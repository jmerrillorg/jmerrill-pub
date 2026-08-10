# Awaiting-State Root Cause

Last verified: 2026-08-10T02:46:15Z

Root cause: STATE_PROJECTION_GAP plus LEGACY_MANUAL_PATH_GAP.

The original approval failed to close the awaiting state because the author reply was not projected into the matching approval gate as a proven decision. The response clock therefore remained open even though the author had responded.

| Question | Answer |
| --- | --- |
| Was correlation information missing? | YES in the live canonical state |
| Was the reply ingested but not projected? | YES as an evidence-chain outcome |
| Was this a legacy/manual path not wired to the new runtime? | YES |

