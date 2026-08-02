# Before You Were Born Response Mechanism

Package version: `BYWB-DEVELOPMENTAL-AUTHOR-REVIEW-2026-08-01-v1`

## Bound Fields

- Canonical title: Before You Were Born
- Canonical title ID: `91c5e1ef-2980-f111-ab0f-7c1e525b15c2`
- Intake code: `JMP-INT-202607-LQPHEK`
- Canonical Contact: `dfb397e7-3b7c-f111-ab0f-6045bdd69435`
- Author: Sean Crowley
- Stage: Developmental Editing
- Package version: `BYWB-DEVELOPMENTAL-AUTHOR-REVIEW-2026-08-01-v1`
- Manifest checksum: see package manifest

## Allowed Responses

- `APPROVE_AS_PRESENTED`
- `APPROVE_WITH_CORRECTIONS`
- `QUESTIONS_OR_CLARIFICATION_REQUESTED`

## Required Response Record

The live response transaction must record:

- authenticated author identity;
- canonical Contact;
- canonical title;
- stage;
- package ID;
- package version;
- manifest checksum;
- approval gate ID;
- response type;
- author notes or governed attachment;
- submitted timestamp.

## Fail-Closed Controls

The response mechanism must reject:

- anonymous approval;
- cross-author access;
- responses for superseded package versions;
- duplicate active gates;
- response clocks started before delivery;
- silence-as-approval.

This evidence file defines the package-bound response contract. The live Dataverse binding must be created by the authenticated Publisher Operating Center session or protected orchestration worker before author release.
