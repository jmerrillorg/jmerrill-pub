# The General's Will and Last Testament Title-Resolution Preflight

Generated: 2026-08-02T04:27:00-04:00

## Scope

This addendum records the first protected dry-run for The General's Will and Last Testament after Jackie cleared the prior disclaimer and timing blockers.

## Before You Were Born Preservation

Before You Were Born remains complete and must not be rerun.

- Gate: e996abe7-2f8e-f111-8077-000d3a14673b
- Dataverse send log: df124fe9-2f8e-f111-8077-6045bdd69435
- Duplicate gates: 0
- Duplicate communications: 0
- Idempotency: PASS
- Current state: Developmental Editing - Awaiting Author Response

The July 30 failed cadence event remains historical failed evidence and is not merged into the current release event.

## Protected Dry-Run

- Workflow: five-title-executive-recovery-dispatch.yml
- Run: 30739633367
- Mode: dry-run
- Title selector: JMP-INT-202607-DL2T20
- Production release: c1822b9be425326959156909bdb5c3a11b4b8bfe
- Identity subject: repo:jmerrillorg/jmerrill-pub:environment:jmerrill-pub-production

Result:
BLOCKED

Returned blockers:

- CANONICAL_TITLE_NOT_FOUND
- CURRENT_STAGE_NOT_FOUND
- AUTHOR_SAFE_PACKAGE_ARTIFACTS_NOT_FOUND
- REQUIRED_PACKAGE_ATTACHMENT_NOT_READY:editedManuscript
- REQUIRED_PACKAGE_ATTACHMENT_NOT_READY:editorialMemo
- REQUIRED_PACKAGE_ATTACHMENT_NOT_READY:reviewInstructions
- REQUIRED_PACKAGE_ATTACHMENT_NOT_READY:packageManifest

No write or send occurred.

## Root Cause

The production allowlist searched this title by exact title text. The live canonical evidence already identifies the title by ID:

2d21ab5b-4d80-f111-ab0f-7c1e525b15c2

The title contains apostrophe variants and historically appeared with display-label normalization differences, so exact string lookup is too brittle for this governed title.

## Repair

The protected five-title allowlist now pins The General's Will and Last Testament to the canonical title ID:

2d21ab5b-4d80-f111-ab0f-7c1e525b15c2

The preflight attachment requirements were also aligned with the current author-package standard. Developmental release now requires:

- editedManuscript
- editorialMemo
- reviewInstructions
- authorResponseMechanism
- packageManifest
- authorCoverMessage

Interior Layout release now requires:

- interiorProof
- reviewInstructions
- authorResponseMechanism
- packageManifest
- authorCoverMessage

## Current Boundary

Production dispatch has not been rerun after this local repair because the repair is pending PR #388 review, merge, and production deployment.

Secret values retained:
0
