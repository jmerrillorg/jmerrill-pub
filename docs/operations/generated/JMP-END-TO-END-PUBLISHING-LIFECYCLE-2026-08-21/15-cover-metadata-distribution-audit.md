# 15 - Cover, Metadata, Distribution Audit

## Current Evidence

Cover Design and Production Proof appear in package policies and author-facing render tests. Title/PF architecture distinguishes product forms, Format & Title Lock, ISBN assignment, release dates, and distributor submission/readback.

## Current Gap

Cover, metadata, and distribution readiness are modeled in docs and partial runtime but not unified under a canonical stage registry. Asset distribution status exists at `jm1pub_publishingasset`; title publication status exists at `jm1pub_title`.

## Required Registry Behavior

Stage 08 must distinguish:

- cover concept/review;
- metadata readiness;
- ISBN eligibility;
- format/product-form readiness;
- distribution artifact readiness;
- irreversible distributor submission.
