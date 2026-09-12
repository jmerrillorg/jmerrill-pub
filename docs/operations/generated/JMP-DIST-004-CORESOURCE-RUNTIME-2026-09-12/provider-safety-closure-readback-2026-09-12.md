# JMP-DIST-004 Provider Safety Closure Readback

Date: 2026-09-12
Mode: read-only provider inspection plus repo hardening

## Classification

`JMP_DIST_004_PARTIAL`

The repository implementation is advanced and fail-closed, but clean closure is not available because provider-public-effect authority is still unproven. No provider mutation, upload, distribution retry, public product creation, or canary execution occurred.

## Proved

- CoreSource authenticated dashboard was visible for `J Merrill Publishing, Inc.`.
- CoreSource dashboard visible counts: eBook `134`, Print `52`, Audio `5`, Number of Distributions `161`, failed title groups `17`.
- CoreSource support ticket `#5862952` remains open; no provider response was visible in the readback.
- Lightning Source authenticated dashboard was visible for `J Merrill Publishing, Inc. Account#: 6116305`.
- Lightning Source dashboard showed recent title rows and global-distribution indicators, proving readable account access.
- DIST-004 runtime now fails closed on unknown canary distribution state, missing release controls, active downstream channels, LSI channel leakage, and current/on-sale canary products.

## Not Proved

- Exact CoreSource field values that make a metadata package safely nondistributable/nonpublic.
- Whether a CoreSource-only canary can be ingested without downstream public effect.
- Complete Lightning Source health/readiness beyond dashboard access.
- IngramSpark account `9118734` health/readiness.
- Amazon Direct and Barnes & Noble Direct read-only role inventory.
- Provider-native machine ingestion method, API/SFTP/FTP credential model, and job-readback contract.
- Finance restriction state; the current provider pages did not expose enough evidence to classify the partial finance issue as resolved.

## Safe Next Steps

1. Wait for or obtain CoreSource support response on ticket `#5862952`.
2. Complete read-only IngramSpark account `9118734` health review.
3. Complete read-only Amazon Direct and Barnes & Noble Direct role inventory.
4. Inspect CoreSource documentation/settings/templates for exact nonpublic/nondistributable fields.
5. Only after those facts pass, prepare a nonpublic canary; do not upload or distribute before the public-effect predicate is proven.
