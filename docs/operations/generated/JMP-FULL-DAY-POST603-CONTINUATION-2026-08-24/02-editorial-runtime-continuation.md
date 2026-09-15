# Editorial Runtime Continuation

Last Verified: 2026-08-24T22:00:00Z

## The General's Will and Last Testament

| Field | Value |
| --- | --- |
| Title ID | `2d21ab5b-4d80-f111-ab0f-7c1e525b15c2` |
| Stage | Line Editing |
| Source artifact | `0c382466-0c9c-f111-b8dc-000d3a14673b` |
| Source checksum | `d1d26531bae4be696150b3db8bbcfa2b8caab6e2d39b7aec34b6c72f11bd3453` |
| Runtime action | Targeted Line Editing retry |
| Result | `EXCEPTION` |
| Blocker | `MICROSOFT_FOUNDRY_HTTP_429_RATE_LIMIT_OF_5000_PER_60S_EXCEEDED_FOR_USERBYMODELBYMINUTEOUTPUTTOKENS` |
| External sends | `0` |

Classification: `EXTERNAL_RUNTIME_CAPACITY_DEPENDENCY`.

## The Long Watch

| Field | Value |
| --- | --- |
| Title ID | `a69b9dfa-bb7b-f111-ab0f-7c1e525b15c2` |
| Developmental stage | `12d961fc-0f85-f111-ab0f-00224820105b` |
| Developmental approval gate | `f79d9b13-688e-f111-8077-000d3a14673b` |
| Approved source artifact | `f29e9aab-1085-f111-ab0f-00224820105b` |
| Line stage materialized | `de969f33-06a0-f111-b8dc-6045bdd69435` |
| Materialization log | `e691ce36-06a0-f111-b8db-7c1e525801f6` |
| Old Dataverse checksum | `93a75018adaaa63d7aa864879826b46dea5b7929ae31e35b86731dd66d69d796` |
| Verified Graph/local checksum | `0d9ff1b6cf700a1decff16e4c5c442307c037101f0280b8937e9f84cc878d599` |
| Checksum repair log | `dcf6179b-06a0-f111-b8dc-000d3a14673b` |
| Stale blocker clear log | `64bcc2bc-06a0-f111-b8dc-7c1e525b15c2` |
| Runtime action | Targeted Line Editing retry after source repair |
| Result | `EXCEPTION` |
| Blocker log | `5ef91718-07a0-f111-b8dc-00224820105b` |
| Blocker | `MICROSOFT_FOUNDRY_HTTP_429_RATE_LIMIT_OF_25000_PER_60S_EXCEEDED_FOR_USERBYMODELBYMINUTEUNCACHEDINPUTTOKENS` |
| External sends | `0` |

The Long Watch no longer has a missing Line-stage materialization blocker or source-checksum metadata blocker. The current blocker is provider capacity.
