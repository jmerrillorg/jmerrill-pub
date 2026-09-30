# General's Will First Line Commissioning

Last verified: 2026-08-20T13:26:21Z

## Target

- Title: `The General's Will and Last Testament`
- Title ID: `2d21ab5b-4d80-f111-ab0f-7c1e525b15c2`
- Author: `Iyorwuese Hagher`
- Approved Developmental artifact: `0c382466-0c9c-f111-b8dc-000d3a14673b`
- Approved Developmental file: `The General's Will and Last Testament - Editorial Working Version - Jackie Restoration.docx`
- Approved Developmental SHA-256: `d1d26531bae4be696150b3db8bbcfa2b8caab6e2d39b7aec34b6c72f11bd3453`
- Approved Developmental gate: `576b9a51-688e-f111-8077-7c1e525b15c2`

## Readback

- Developmental Editing stage: COMPLETE.
- Approved artifact is current and checksum-bearing.
- Approved gate is approved and has `nextStageAuthorized=true`.
- Line Editing stage for this title: not present at time of readback.

## Commissioning Result

Status: `LINE_STAGE_MATERIALIZATION_BLOCKED_BY_UNTARGETED_CONTROL_PLANE`

The first Line run was not executed. The deployed admin replay route for editorial execution accepts only `maxTasks`, selects active executable stages globally by modified date, and cannot target this title/stage. The approval-event consumer also cannot create the Developmental-to-Line transition; it blocks non-Proofreading approvals as `NEXT_STAGE_EXECUTOR_MISSING`.

## Safety Decision

No broad replay was executed. No second title was used. No unmerged local runtime path was used. No Line output was created or discarded.

