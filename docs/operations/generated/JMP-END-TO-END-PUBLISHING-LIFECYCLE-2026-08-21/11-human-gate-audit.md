# 11 - Human Gate Audit

## Current Strengths

`editorialAuthorGatePolicy.js` and its tests require author approval between Editorial Review, Developmental, Line, Copy, and Proofreading stages. Approval must be full, non-superseded, date-stamped, next-stage-authorized, and bound to a checksum-bearing artifact.

## Current Gaps

Production final approval, cover approval, distribution readiness, and release approval are not yet governed by one shared gate registry.

## Offline/Verbal Decisions

The system can record human decisions that arrive outside the portal. The General's Will live gate summary records a verbal approval by the author, recorded by the Publisher with date-level precision. This aligns with the canon rule: record human decisions instead of making humans repeat them.

## Required Registry Rule

Every human gate must define:

- who can decide;
- decision vocabulary;
- exact artifact/version/checksum;
- decision source;
- evidence location;
- whether next stage is authorized.
