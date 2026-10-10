# Regression Tests — Honest Status

No automated test suite was implemented in this pass for the offline-decision-capture contract itself (unlike PR #517/#518, which had dedicated, executable regression tests). This section states plainly what was and wasn't verified, rather than claiming coverage that doesn't exist.

## Verified live, this session (real evidence, not a mock)
1. PHONE approval authorizes next stage when artifact matches — **proven live** for The General's Will (see 06).
7. recordedBy differs from decisionMadeBy — **proven live** (Jackie recorded; Iyorwuese decided; both captured distinctly in `jm1pub_authorresponsesummary`/`jm1pub_authordecisionsource`).
8. Artifact checksum binding required — **proven live** (the missing artifact record was created and bound before the decision was recorded; the write sequence has no path that skips this).
12. Email/workspace approval behavior unchanged — **true by construction**: this capability writes to the exact same fields `authorReviewResponseConsumer.js` already writes to, using the same picklist and no schema changes; that consumer's own code was not modified.

## Not implemented / not automatically verified this pass — real gaps, not oversights
2. IN_PERSON / 3. SMS — not exercised; the channel field is free text, so nothing in the write path would reject them, but no test proves it.
4/5/6. CHANGES_REQUESTED / QUESTION / HOLD not advancing the stage — the write-sequence design in 04 keeps `nextStageAuthorized=false` and the gate open for these decisions, but this was not exercised live this session (only APPROVE was, for the real Iyorwuese case).
9. Superseded-artifact rejection — no automated check exists; this pass relied on manual verification ("no later manuscript supersedes it") rather than a coded guard.
10. Duplicate-recording idempotency — the execution log's idempotency-key convention (key first, matching the PR #518 lesson) is written correctly, but no automated lookup/replay-guard function was built to actually detect and block a duplicate write.
11. Conflict detection between a later email and an earlier verbal decision — **not implemented**. Explicitly flagged in 04-offline-decision-contract.md as a real, current gap.

## Recommendation
If this capability is to be used again for other titles/stages, items 9, 10, and 11 above should become real code (a dedicated `recordOfflineAuthorDecision()` function in the pattern of `publishing-dispatch-service.ts`'s `recordExternalDeliveryEvidence()`, with genuine idempotency and conflict-detection logic) rather than repeated by-hand API calls. This pass deliberately did the minimum needed to correctly and safely record one real, founder-confirmed event — not a reusable runtime component. That's the honest scope of what happened here, per the "small bounded fix, not a rewrite" instruction, but it means this is a **process**, not yet a **product** — worth flagging as its own follow-up PR if this pattern will recur.
