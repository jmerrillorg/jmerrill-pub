# PAM-002 - Backlist Consolidation Strategy

**Status:** Planning only  
**Date:** 2026-07-07  
**Do Not Execute Yet:** No file movement is authorized by this document.  

## Strategy

PAM-002 should consolidate by reference first, then by controlled file movement only after Jackie approves an execution window and destination standard. The first operational target is a complete file-to-PAM evidence map, not immediate folder cleanup.

## Recommended Execution Order

1. Freeze source snapshots and hashes for the four approved source locations.
2. Create a file evidence index with path, size, modified date, extension, inferred class, and probable author/title/ISBN.
3. Match evidence to certified PAM records using Publisher Master Register, ISBNs, title normalization, and asset marketplace identifiers.
4. Mark each file/folder as `Canonical Evidence`, `Duplicate Candidate`, `Generated Variant`, `Needs Identity Review`, or `Do Not Move`.
5. Produce a proposed SharePoint destination map for Jackie review.
6. Execute a small pilot consolidation on one low-risk author/title after approval.
7. Scale by author/title family, preserving all source paths until validation passes.

## Estimated Migration Effort

| Phase | Estimate | Notes |
| --- | ---: | --- |
| Evidence index build | 1-2 days | Automated inventory over approximately 21,716 raw files, with overlap adjustment. |
| PAM matching and confidence scoring | 2-4 days | ISBN/title/author normalization and exception queues. |
| Destination map and review packet | 1-2 days | Requires Jackie approval before movement. |
| Pilot consolidation | 1 day | One author/title family. |
| Full controlled consolidation | 1-3 weeks | Depends on duplicate volume, OneDrive sync behavior, and review exceptions. |

## Jackie-Only Decisions

| Decision | Why Jackie |
| --- | --- |
| Destination folder canon | Determines final governed SharePoint structure. |
| Duplicate deletion policy | Deletion is destructive and not currently authorized. |
| Version retention standard | Legal/production risk if older versions are removed too early. |
| Contract evidence threshold | Determines what counts as linked historical agreement evidence. |
| Handling of legacy design formats | Some files may be difficult to open but still legally/operationally important. |
| Pilot author/title selection | Business judgment and risk tolerance. |

## Recommended Next Step

Authorize PAM-002 Evidence Index Build. This remains non-destructive and creates the source-to-PAM map needed before any file consolidation proposal.
