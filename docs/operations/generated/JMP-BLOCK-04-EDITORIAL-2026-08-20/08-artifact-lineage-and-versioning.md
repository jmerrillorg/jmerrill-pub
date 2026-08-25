# Artifact Lineage And Versioning

Last Verified: 2026-08-25

## Rules

- Next stage source must be the exact prior author-approved artifact unless a governed transformation is validated.
- Artifact approval must match the current artifact id and checksum.
- Source manuscript replacements cannot silently overwrite the working source.

## Audit Status

Status: IMPLEMENTED_ENFORCED

Evidence:

- `resolveNextStageSourceAuthority`
- `resolveSourceChangeImpact`
- `author approval must bind to the exact current artifact and checksum`
- `next editorial stage cannot consume an unapproved or changed source artifact`
- `source manuscript replacement cannot be silently merged`
