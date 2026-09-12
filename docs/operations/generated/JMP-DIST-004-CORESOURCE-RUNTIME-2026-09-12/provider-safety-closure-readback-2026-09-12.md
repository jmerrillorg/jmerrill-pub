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
- IngramSpark authenticated account `9118734` was visible with `239` title rows and operable title/upload controls.
- ACX authenticated project dashboard was visible for Jackie Smith with current project counts and a royalty-model prompt.
- Amazon KDP authenticated Bookshelf was visible with live/draft products, ASINs, pricing links, and direct management controls.
- Barnes & Noble Press direct inventory was blocked by an authentication code challenge.
- DIST-004 runtime now fails closed on unknown canary distribution state, missing release controls, active downstream channels, LSI channel leakage, and current/on-sale canary products.

## Not Proved

- Exact CoreSource field values that make a metadata package safely nondistributable/nonpublic.
- Whether a CoreSource-only canary can be ingested without downstream public effect.
- Complete finance/payment health for Lightning Source, IngramSpark, Amazon KDP, and CoreSource where not exposed in the captured account pages.
- Barnes & Noble Direct read-only role inventory after human authentication.
- Every-title/every-format/every-channel routing and ownership matrix.
- Provider-native machine ingestion method, API/SFTP/FTP credential model, and job-readback contract.
- Finance restriction state remains explicitly enumerated rather than generically partial; no current provider page exposed enough billing/payment evidence for clean closure.

## Safe Next Steps

1. Wait for or obtain CoreSource support response on ticket `#5862952`.
2. Complete human-authenticated Barnes & Noble Press direct inventory.
3. Complete provider billing/payment/finance evidence where not exposed on dashboard/messages.
4. Complete the title-format/channel ownership matrix before any route normalization.
5. Only after CoreSource safe-state facts pass, prepare a nonpublic canary; do not upload or distribute before the public-effect predicate is proven.
