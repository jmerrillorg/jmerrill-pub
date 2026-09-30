# 07 - Title Lifecycle

## Current Sources

Title lifecycle is spread across:

- `jm1pub_title`
- `jm1pub_publishingasset`
- `jm1pub_editorialstage`
- `jm1pub_editorialartifact`
- `jm1pub_editorialapprovalgate`
- `jm1_productionprojects`
- `jm1_productiontasks`
- `jm1_executionlogs`

## Canonical Chain Required

AUTHOR ORIGINAL -> NORMALIZED WORKING SOURCE -> EDITORIAL REVIEW SOURCE -> DEVELOPMENTAL -> APPROVED DEVELOPMENTAL -> LINE -> APPROVED LINE -> COPY -> APPROVED COPY -> LAYOUT -> PROOF -> FINAL INTERIOR -> DISTRIBUTION ARTIFACT.

## Current Runtime Capability

Editorial Review, Developmental, Line, Copy, Proofreading, Interior Layout, Cover Design, and Production Proof have partial code/test coverage. Live stage rows confirm active titles in Developmental, Line, Proofreading, and Interior Layout states.

## Current Defect

Line Editing cannot be considered fully runtime-ready while the live General's Will gate summary records a hold caused by the PR #519 pipeline-alignment audit.
