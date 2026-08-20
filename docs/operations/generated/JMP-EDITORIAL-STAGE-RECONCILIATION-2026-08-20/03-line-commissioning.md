# Line Commissioning

Last verified: 2026-08-20T13:48:10Z

## Line Runtime

Line runtime remains repaired from PR #521:

- Claude / Microsoft Foundry route required for Line.
- Silent fallback is not allowed.
- Model output is used as the Line edited manuscript.
- Retention/drift QA enforces the 95% to 100% window.
- Author review gate creation leaves `nextStageAuthorized=false`.

## Targeted Control Status

Targeted control is implemented and tested in this PR, but not deployed to production until merge/deploy.

## First Commissioning Title

- Title: The General's Will and Last Testament
- Title ID: `2d21ab5b-4d80-f111-ab0f-7c1e525b15c2`
- Approved Developmental artifact: `0c382466-0c9c-f111-b8dc-000d3a14673b`
- Approved Developmental checksum: `d1d26531bae4be696150b3db8bbcfa2b8caab6e2d39b7aec34b6c72f11bd3453`

## Current Blocker

No Line stage row exists for this title at readback. The targeted control is required to reject this state as `TARGET_STAGE_NOT_FOUND`.

## Second Commissioning Title

- Title: The Long Watch
- Title ID: `a69b9dfa-bb7b-f111-ab0f-7c1e525b15c2`
- Approved Developmental artifact: `f29e9aab-1085-f111-ab0f-00224820105b`
- Approved Developmental checksum: `93a75018adaaa63d7aa864879826b46dea5b7929ae31e35b86731dd66d69d796`

## Current Blocker

No Line stage row exists for this title at readback. The targeted control is required to reject this state as `TARGET_STAGE_NOT_FOUND`.

