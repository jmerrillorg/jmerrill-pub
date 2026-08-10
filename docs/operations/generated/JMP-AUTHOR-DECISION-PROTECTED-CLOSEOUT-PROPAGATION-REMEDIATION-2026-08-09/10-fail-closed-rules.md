# Fail-Closed Rules

Last verified: 2026-08-10T02:46:15Z

The following fail closed to HOLD / REVIEW_REQUIRED:

| Failure | Outcome |
| --- | --- |
| Ambiguous reply | HOLD |
| Unmatched reply | HOLD |
| Wrong title | HOLD |
| Wrong review package | HOLD |
| Artifact mismatch | HOLD |
| Missing checksum | HOLD |
| Multiple candidate artifacts | HOLD |
| Decision/artifact mismatch | HOLD |
| Stale awaiting record with no correlating decision | HOLD |
| Duplicate decision ingestion | Idempotent, no duplicate business record |

