# CC-010 Claude Production Commissioning Evidence Package

Last verified: 2026-08-14T01:20:30Z

## Classification

COMPLETE - CLAUDE PRODUCTION COMMISSIONING FOR STAGE 0

## Scope

This package records the commissioning of the governed Microsoft Foundry Claude route for JMP editorial routing:

- Stage 0 / Editorial Review: Claude preferred and production-proven.
- Developmental Editing: Claude preferred route commissioned in routing policy; no safe real developmental model execution was performed because current real developmental records are not at a clean model-execution boundary.
- Line Editing: Claude preferred route commissioned in routing policy; no safe real line model execution was performed because no current line-stage record is at a clean model-execution boundary.
- Copyediting and Proofreading: OpenAI preference preserved.

## Production Result

| Item | Result |
| --- | --- |
| Repository | `jmerrillorg/jmerrill-pub` |
| Runtime release SHA | `fa8c66f7e5d7b0a7acfa0395516bb95eb3955197` |
| Foundry account | `ais-jm1-foundry` |
| Foundry project | `jm1-editorial-foundry` |
| Claude deployment | `jm1-editorial-devline-primary` |
| Model | `claude-sonnet-5` |
| Model version | `2` |
| Region | `eastus2` |
| Deployment state | `Succeeded` / running |
| Stage 0 live transaction | ACCEPTED |
| Live title/intake | Quanishia, `JMP-INT-202608-0AOS7L` |
| Diagnostic ID | `572a89ef-cd95-f111-8076-7c1e525b15c2` |
| Provider selected | `microsoft-foundry-claude` |
| Fallback used | `false` |
| Output validation | PASS |
| Metadata writes | PASS |
| Author communication | 0 |
| Opportunity creation | 0 |
| Manual stage progression | 0 |

## Root Cause Closed

The prior production failure was not one single defect. It had three layers:

1. The Dataverse prompt alias had drifted toward fallback routing. That was corrected to `jm1-editorial-devline-primary`.
2. The Foundry Claude provider had not been commissioned against the supported Anthropic Messages endpoint and Entra ID path. That was corrected in the canonical provider route.
3. The new Foundry provider inherited the Azure OpenAI 1,200-token output cap. A live Claude call reached exactly 1,200 output tokens and produced no usable final JSON. The Foundry Claude output budget was aligned to the existing Claude editorial standard of 4,096 tokens, after which the live Stage 0 transaction succeeded.

## Evidence Index

- `01-foundry-deployment.md`
- `02-runtime-route-and-code.md`
- `03-stage0-live-proof.md`
- `04-developmental-line-boundary.md`
- `05-validation-and-negative-proof.md`
- `checksums.sha256`

## Boundary

No new architecture was created. No direct Anthropic normal-runtime path was revived. The existing canonical route was repaired and production-proven.

