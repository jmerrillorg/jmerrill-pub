# Controlled Internal Render

Last verified: 2026-08-21T08:56:44Z

## Test Case

Recipient: `jm1-admin@jmerrill.one`

Project title: `Package Acceptance Test Title`

Reference: `JMP-INT-202608-PAC001`

Package: `Professional Publishing Package`

CTA: `https://www.jmerrill.pub/author/portal`

This was an internal controlled test, not a live author send.

## Rendered Subject

`Your Publishing Payment Options for Package Acceptance Test Title`

## Engine Output Reflected

- Full Pay
- 2-Pay
- 4-Pay
- 8-Pay
- Returning Author Benefit: 15%
- Referral credit selected for preview: 20%
- Combined Benefit: 35%
- Adjusted package principal: `$2,925.00`
- 2-Pay total: `$3,042.00 + applicable tax`
- 4-Pay total: `$3,042.00 + applicable tax`
- 8-Pay total: `$3,042.03 + applicable tax`

## Render Metadata

- template: `PACKAGE_ACCEPTANCE_PAYMENT_OPTIONS_V1`
- template version: `1.0.0`
- quality gate: `PASS`
- HTML checksum: `777e72917f271917e2646b154e37b351792eedab13cd8eff2d8249793ccbb73e`
- plain-text checksum: `6585fc6090824f8d9dc7e28ba13b5a23625f010690b514a31173d801f2e4db5e`

## First Attempt

The first relay attempt was rejected before delivery with `MESSAGE_TYPE_INVALID` because the renderer returned draft field names without the existing relay `APPROVED_AUTHOR_RESPONSE` message type.

Disposition: fixed in the renderer contract and covered by a focused test assertion before retry.

