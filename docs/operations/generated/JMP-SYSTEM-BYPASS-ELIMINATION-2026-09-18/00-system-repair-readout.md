# JMP System-Bypass Elimination and Communication Canon Repair

Date: 2026-09-18

## September 18 Trace

The three Developmental recovery messages were operator-triggered calls to the deployed ACS `send-approved-author-response` route. Application Insights recorded accepted requests at 07:19:28Z, 07:19:30Z, and 07:19:31Z for A Year Walking With Him, Naughty Tales, and Indomitable respectively.

| Authority | Readback |
| --- | --- |
| Email trigger | Operator recovery script calling the ACS relay directly |
| Template selection | Operator payload, bypassing the cadence package sender |
| Template ID/version | `AUTHOR_REVIEW_PACKAGE_NOTIFICATION_V1` / `1.0.0` |
| HTML renderer | `JM1 Enterprise Communication Renderer` metadata attached to operator-supplied HTML |
| Canonical source | `azure-functions/diagnostic-ai-runner/src/editorial/editorialCadenceAuthorPackageSender.js` |
| Production relay | `func-jm1-acs-email-relay` |
| Deployed release SHA | `0f560d8d131eb7010b74e0a35b7d90796cbc5023` |
| Runtime release SHA | `f4029127403d26b976fa8a4234824d6f15814d3d` |

The relay validated generic author-review HTML and attachment bytes, but it did not require Developmental semantic roles or a complete artifact manifest. Its attachment normalizer also discarded roles. The repository's own V1 sender rendered the rejected checklist headings, so conversational canon was not executable system authority.

## Repair

- Developmental communication now uses `DEVELOPMENTAL_EDITORIAL_REVIEW_READY_V2` / `2.0.0`.
- The system renderer produces natural correspondence without the rejected headings.
- Developmental materialization requires one `editedManuscript` and one `reviewInstructions` artifact.
- Both artifacts must be current author-facing records bound to the same title and stage, with a version matching the package.
- The sender supplies explicit package-completeness and binding evidence to the relay.
- The relay independently rejects incomplete manifests, review-only payloads, untyped attachments, binding failures, and rejected checklist headings.
- Sender authority remains `publishing@email.jmerrill.one`; Reply-To and CC remain `publishing@jmerrill.one`.
- Incident closure now requires client recovery, canonical repair, regression proof, deployment when required, and system replay.

## Replay Result

The exact Indomitable title, stage, gate, contact, package, author, and intake reference were replayed through `sendCadenceAuthorReviewPackage` without a live relay call.

- Review-only state: correctly failed closed with `REQUIRED_ATTACHMENT_MISSING:editedManuscript`; relay calls: 0.
- Complete governed fixture: system-generated V2 conversational copy; both semantic roles present; title, stage, author, and version parity passed; sender canon passed.
- Manual composition was not used as proof.

This is source and regression proof only. Production deployment and post-deployment non-sending system replay remain required before incident closure.

## Verification

| Check | Result |
| --- | --- |
| Diagnostic sender, cadence, duplicate-send, and incident-closure tests | 24 PASS |
| ACS relay validation suite | 47 PASS |
| Human-first Developmental scaffolding policy regression | PASS |
| JavaScript syntax checks | PASS |
| Broader author communication guard | 10 PASS / 1 unrelated pre-existing binary-check expectation failure under the local dependency shim |
| Production deployment | NOT PERFORMED |
| Author communications | 0 |

## Current Classification

`CLIENT_RECOVERY_STATUS = PASS`

`SYSTEM_REPAIR_STATUS = SYSTEM_REPAIRED_NOT_COMMISSIONED`

`INCIDENT_CLOSURE = FAIL`

The closure gate is merge, deployment of both affected Functions applications, and a post-deployment non-sending replay/readback.
