# 09 - Legacy Mapping

Machine inventory: `lib/publishing/lifecycle/legacy-mapping.ts`

| Mapping Type | Behavior |
|---|---|
| EXACT | Legacy value maps directly to one canonical stage/substage |
| CONTEXT_DEPENDENT | Context is required but mapping can be resolved |
| CONFLICT | Value is ambiguous or semantically unsafe |
| UNMAPPED | No mapping exists yet |

## EDITORIAL_REVIEW

Legacy `EDITORIAL_REVIEW` maps to Stage 03 only when context is `PROSPECT_INQUIRY`.

Legacy `EDITORIAL_REVIEW` with active-author context returns `CANONICAL_MAPPING_CONFLICT` because active title editorial work must be Developmental, Line, or Copy under Stage 06.

## Duplicate Policy Authority

Package preparation, package release, notification sent, package accepted, payment-option selection, and business event completion are distinct semantic events. Wave A establishes this meaning; cleanup of duplicate package/notification runtime policy remains future bounded work.
