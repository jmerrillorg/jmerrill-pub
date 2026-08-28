# JMP Human Last-Mile and ACS CI/CD Final Closure

Last Verified: 2026-08-27T18:43:03Z

## Scope

This package closes the August 27, 2026 final-readback pass for two separate controls:

1. Human last-mile delivery trust for author-facing Publishing packages.
2. ACS relay CI/CD authority for governed sender delivery.

## Result

| Control | Result | Evidence |
| --- | --- | --- |
| ACS relay CI/CD | COMMISSIONED | Protected GitHub OIDC workflow deployed the ACS relay from canonical main and production readback identifies the same release package. |
| Manual ACS deployment as normal path | FALSE | Future ACS relay deployment is governed through `.github/workflows/azure-functions-acs-relay-flex.yml` using OIDC and run-from-package. |
| Establishing Glory recipient-byte proof | FAIL-CLOSED | The recipient mailbox attachment bytes were retrieved from `publishing@jmerrill.one`, but the DOCX checksum did not match the certified outbound artifact checksum. |
| Establishing Glory author approval binding | NOT CONSUMED | Jackie approval remains preserved as evidence, but it is not bound to the mismatched attachment. |
| Long Watch pre-release state | SCHEDULED / NOT SENT | Existing Line output is known and cadence-scheduled for future author release. No Line rerun occurred. |

## Classification

Publishing human-facing last-mile:

`JMP_HUMAN_LAST_MILE_CONTROLLED_COMMISSIONING`

ACS relay CI/CD:

`ACS_RELAY_CICD_COMMISSIONED`

Overall last-mile closure:

`JM1_HUMAN_LAST_MILE_CONTROLLED_COMMISSIONING`

## Important Boundary

The ACS deployment trust gap is closed.

The Establishing Glory human-trust gate is not closed because exact recipient attachment bytes do not match the certified outbound artifact. This package preserves that mismatch as evidence and prevents the author approval from being consumed against the wrong or unproven artifact.

