# Failure Classification

Last verified: 2026-08-11T02:19:52Z

| Failing assertion | Classification | Finding | Disposition |
|---|---|---|---|
| `manifest controls email attachments and workspace downloads` | TEST_RUNTIME_POLICY_DRIFT | Proofreading package-engine policy used `proofreadingCoverNote` while canonical notification and dispatch require `reviewInstructions`. | Runtime policy and tests aligned to `proofreadManuscript` + `reviewInstructions`. |
| `complete package release hands off to canonical notification engine` | TEST_RUNTIME_POLICY_DRIFT | Same Proofreading package-policy drift caused canonical notification validation to fail. | Runtime policy and fixtures aligned to canonical required attachments. |
| `governed cadence retest certifies only when all six evidence lanes pass under one correlation` | TEST_RUNTIME_POLICY_DRIFT | Cadence certification depends on canonical notification validation, so the Proofreading policy drift blocked certification. | Notification handoff now validates and cadence certification passes. |
| `Developmental and Interior notifications preserve required response, manifest, and cover-message attachments` | TEST_RUNTIME_POLICY_DRIFT | Package-engine test and policy treated internal response, manifest, and cover-message artifacts as author-facing email/workspace delivery items. Canonical notification guard correctly blocks them. | Internal artifacts remain QA-required but are not author-visible, email attachments, or workspace downloads. Test now proves the fail-closed guard remains active. |

No failure was classified as `REAL_RUNTIME_DEFECT`. The canonical notification guard remains correct and was not weakened.

