# Cover Design Authority

Last verified: 2026-08-10T09:17:30Z

## Governing Capability

Cover Design is governed under Production & Distribution. The Publishing Capability Register ruled Cover Design as ABSORB into Production & Distribution with cover-specific approval, QA, and production dependencies preserved.

## Runtime Authority

`docs/implementation/OP-006-Cover-Design-Command-Center.md` remains supporting operational evidence for the Cover Design surface. It states that Dataverse is the operational source of truth, SharePoint is the evidence/file layer, the website route is read-only, and Cover Design does not place design orders, send vendor or author communications, submit files, or trigger layout, distribution, launch, royalty, payment, Stripe, or Business Central activity.

## Canonical Runtime States

`lib/server/publisher-operating-center.ts` defines these cover readiness states:

- READY FOR CREATIVE BRIEF
- CREATIVE BRIEF IN PROGRESS
- READY FOR CONCEPTS
- CONCEPTS IN PROGRESS
- INTERNAL REVIEW
- AUTHOR REVIEW
- FRONT COVER APPROVED
- WAITING FOR PAGE COUNT
- FULL WRAP IN PROGRESS
- FULL WRAP APPROVED

## Current and Permitted Next State

Current state: CREATIVE BRIEF IN PROGRESS.

Permitted next state for this readiness package: INTERNAL REVIEW, only by registering an already-existing internal concept-development package as the governed baseline. No new state is invented.

Actual image generation/design belongs to a later action unless Jackie separately authorizes it.
