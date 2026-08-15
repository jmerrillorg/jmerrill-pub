# 16 - Agreement Test Defect Classification

Last verified: 2026-08-15T02:26:18.195Z

| Item | State |
| --- | --- |
| npm test | 1873 tests / 1870 pass / 3 fail |
| Failure file | test/agreementGeneratedPackageMirror.test.js only |
| Classification | UNRELATED_KNOWN_DEFECT - generated agreement blob mirror lane, not CC-010 editorial runtime/model routing/author gates |
| Failures | uploads all four documents under generated-agreements/{diagnosticId}/ and verifies each by hash (11.840625ms); the manifest's per-file hashes match the actual uploaded content (5.344334ms); liveActions confirms staging-only scope (6.342709ms) |
