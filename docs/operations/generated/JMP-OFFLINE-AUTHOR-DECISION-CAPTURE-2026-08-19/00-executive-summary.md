# Offline/Verbal Author Decision Capture — Executive Summary

**Date:** 2026-08-19

## What this delivers
A channel-agnostic author-decision capture model, reusing 100% existing Dataverse schema (no new fields), that lets an authenticated Publisher operator record a real author decision (approve/revise/clarify/hold) that occurred over phone, in person, Teams, SMS, or another governed channel — with the same mandatory artifact binding, decision/channel separation, and decision-maker-vs-recorder provenance as any other channel.

## Immediate application
Iyorwuese Hagher's verbal phone approval of The General's Will and Last Testament's Final Developmental artifact was recorded through this model. Developmental Editing is now CLOSED. Line Editing is ELIGIBLE but intentionally HELD (`LINE_READY_PENDING_RUNTIME_ALIGNMENT`) because the 2026-08-19 pipeline-alignment audit (PR #519) found Line Editing's runtime currently produces mislabeled Developmental-stage boilerplate, not a real line edit — starting it now would mean executing known-stale behavior.

## Schema used (no additions)
- `jm1pub_authordecision` (existing picklist: Approve/Request Revision/Request Clarification/Hold/Decline/Override Approved) — implements the Decision dimension exactly.
- `jm1pub_authordecisionsource` (free text, existing, previously used for provenance tags elsewhere in this system) — encodes channel + decision-maker + recorder as a structured tag.
- `jm1pub_authorresponsesummary` (free text, existing) — full narrative, decision-maker vs. recorder attribution, and the decisionOccurredAt/recordedAt distinction.
- `jm1pub_deliverableartifactid` (existing lookup) — mandatory exact-artifact binding.
- `jm1_executionlogs` (existing entity, same pattern used throughout this session) — audit trail.

No parallel approval subsystem was built.
