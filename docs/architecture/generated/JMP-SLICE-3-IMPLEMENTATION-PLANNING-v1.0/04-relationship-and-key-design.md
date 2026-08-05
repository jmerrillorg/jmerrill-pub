# Relationship and Alternate-Key Design

Status: DESIGN ONLY
Implementation authority: NO

| Relationship | Cardinality | Lookup direction | Ownership | Cascade behavior | Delete behavior | Required | Solution ownership | Security implications |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Title to Editions | One title to many editions | jm1pub_edition looks up jm1pub_title | Title owner governs edition family; edition owner handles production | Restrict/none for delete; rollup only for status | No destructive cascade; block delete when history exists | Required on edition | Publishing lifecycle solution | Edition visibility inherits author-safe projection, not internal table access. |
| Title to Editorial Master versions | One title to many version records/references | Version/artifact authority looks up title | Editorial authority | No destructive cascade | Preserve versions permanently or per retention decision | Required when versioned master exists | Artifact authority solution | Internal only except author-safe package output. |
| Title to Release Plans if approved | One title to many release plans if entity approved | Release plan looks up title | Publishing operations | No destructive cascade | Block delete after submission/live event | Optional until entity approved | Publishing lifecycle solution | Release plans may influence author projection. |
| Edition to Artifacts | One edition to many source/output artifacts | Artifact authority looks up edition or edition stores references | Production/artifact authority | No destructive cascade | Preserve source/output evidence | Required for production output states | Artifact authority solution | Internal artifacts hidden from authors unless included in author package. |
| Edition to Distribution Jobs if approved | One edition to many jobs | Distribution job looks up edition | Distribution operations | No destructive cascade | Block delete after submission/readback | Optional until entity approved | Distribution solution | Submission evidence internal; projected status only. |
| Title/Edition to Execution Log events | Many logs to title and/or edition | jm1_executionlog stores title/edition lookups | Event owner is creating actor/service | No destructive cascade | Never cascade delete operational history | Required where event concerns title/edition | Execution evidence solution | Auditor read allowed; authors no direct access. |
| Correction Authorization to affected Editions | One correction to many affected editions | Join/child relationship if correction entity approved | Executive approver owns correction authority | No destructive cascade | Preserve correction history | Required if correction entity approved | Publishing lifecycle solution | Correction scope internal; author projection only. |
| Commercial Catalog Item to eligible PF/Edition behavior | Catalog item referenced by edition/catalog read event | Edition or log stores catalog item reference/fingerprint | Commercial catalog remains Slice 2 authority | No cascade from catalog to editions | Catalog retirement does not delete edition history | Required for commercial PF transitions | Commercial catalog solution | Catalog visibility policy governs public exposure. |

## Proposed Alternate Keys

| Purpose | Proposed key | Applies to | Rule |
| --- | --- | --- | --- |
| Edition identity | title natural key + product form + edition sequence/version | jm1pub_edition | Reject duplicate active edition/PF identity unless Companion Edition authority creates distinct sequence. |
| Transition idempotency | transition ID + object type + object ID + from + to + authority reference | transition registry/request | Same request returns no-op; divergent payload conflicts. |
| Execution-log idempotency | event code + object ID + resulting state/action + correlation ID + source authority | jm1_executionlog | Prevents duplicate operational evidence. |
| Release-plan identity | title ID + release model + anchor date + plan sequence | release plan if approved | Blocked until release-plan entity decision. |
| Distribution-job identity | edition ID + channel + package hash + submission attempt | distribution job if approved | Blocked until distribution-job entity decision. |
| Correction authorization | title ID + correction sequence + approval reference | correction authority if approved | No correction path without approval evidence. |
| Author-facing status projection | title ID + projection version + source state hash | projection if persisted | Blocked until persistence decision. |
