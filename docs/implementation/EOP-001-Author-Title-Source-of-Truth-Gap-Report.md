# EOP-001 Author / Title Source-of-Truth Gap Report

**Program:** PROGRAM-002  
**Optimization Program:** EOP-001  
**Status:** Source-of-truth gap identified  
**Date:** 2026-07-06  

## Executive Summary

The 71-author roster derived from `data/books.json` is invalid for governance. `books.json` is legacy catalog evidence only. It may help identify candidates for reconciliation, but it cannot govern author identity, title ownership, Contact matching, Stripe migration, contract reconciliation, royalty readiness, or Enterprise Health.

Enterprise Coverage remains operational as a migration/adoption milestone, but author-roster health is provisional until a Dataverse-backed author/title relationship source is validated.

## Invalidated Artifacts

| Artifact | Status | Reason |
|---|---|---|
| `docs/implementation/EOP-001-Published-Author-Roster.md` | PROVISIONAL / INVALID FOR GOVERNANCE | Derived from `data/books.json` |
| `data/eop001-published-author-roster.json` | PROVISIONAL / INVALID FOR GOVERNANCE | Derived from `data/books.json` |
| EOP-001 dashboard author counts using 71-author roster | PROVISIONAL | Count is legacy-evidence-derived until Dataverse Contact/title relationships are validated |
| EOP-001 Workstream 1 imprint packet author/title pairings | PROVISIONAL | Generated from catalog/adoption evidence, not authoritative Contact/title joins |

## Verified Dataverse Metadata

Read-only Dataverse metadata inspection against JM1-Core (`jm1hq.crm.dynamics.com`) confirmed:

| Entity | Entity Set | Status |
|---|---|---|
| `contact` | `contacts` | Exists |
| `jm1pub_title` | `jm1pub_titles` | Exists |
| `jm1pub_contract` | `jm1pub_contracts` | Exists |
| `jm1pub_titleownership` | Not returned | Not confirmed as a live entity |

`jm1pub_title` relationship metadata confirmed these relevant lookups:

| Table | Lookup Column | Referenced Entity | Relationship Meaning |
|---|---|---|---|
| `jm1pub_title` | `jm1_primaryauthor` | `contact` | Candidate canonical title-to-Contact relationship |
| `jm1pub_title` | `jm1_author` | `jm1_author` | Separate author entity; not Contact party master |
| `jm1pub_title` | `jm1_contract` | `contract` | Legacy/standard contract relationship |
| `jm1pub_title` | `jm1pub_contract` | `jm1pub_contract` | Canonical publishing contract relationship candidate |
| `jm1pub_title` | `jm1_project` | `jm1_project` | Project relationship |
| `jm1pub_title` | `jm1_imprint` | `jm1_imprint` | Imprint relationship |
| `jm1pub_title` | `jm1pub_authoraccount` | `jm1_accounts` | Author account relationship |

## Source-of-Truth Gap

The current source-of-truth gap is not that Dataverse lacks all author/title relationship capability. The gap is that the relationship model has not yet been validated as populated, complete, and canonical for the full catalog.

Known gap items:

- No verified Dataverse readback yet proves all published catalog titles exist as `jm1pub_title` rows.
- No verified Dataverse readback yet proves every `jm1pub_title` has `jm1_primaryauthor` populated to the correct Contact.
- No verified Dataverse readback yet proves multi-title authors are consolidated under one canonical Contact.
- No verified Dataverse readback yet proves historical contracts are linked through `jm1pub_contract` or legacy `contract`.
- `jm1pub_titleownership` was not confirmed as a live entity during metadata inspection.
- Execution logs prove events occurred; they do not govern identity.
- SharePoint workspaces and contract files can corroborate identity but are not party-master authority.

## Corrected Canonical Roster Plan

Build the canonical Published Author Roster from Dataverse first:

1. Query `jm1pub_titles`.
2. Join each title to `jm1_primaryauthor` Contact.
3. Use Contact as the party master.
4. Treat `jm1_author` as supporting domain metadata only unless Jackie confirms otherwise.
5. Link contract evidence through `jm1pub_contract` first, then legacy `contract` where applicable.
6. Use SharePoint workspace evidence to corroborate, not govern, author/title identity.
7. Use execution logs only as proof of adoption/reconciliation events.
8. Flag any title without a valid `jm1_primaryauthor` Contact as `AUTHOR_TITLE_RELATIONSHIP_MISSING`.
9. Flag any Contact with duplicate/similar identity risk as `CONTACT_IDENTITY_REVIEW_REQUIRED`.
10. Recalculate Enterprise Health author metrics only after Dataverse roster readback passes.

## Recommended Dataverse Relationship Model

Minimum canonical model:

| Relationship | Required Behavior |
|---|---|
| Contact -> Title | Contact is the author party master; `jm1pub_title.jm1_primaryauthor` links title to Contact |
| Contact -> Published Author Workspace | Contact owns workspace mode/status; one author workspace can contain multiple titles |
| Title -> Contract | `jm1pub_title.jm1pub_contract` links canonical publishing contract where present |
| Title -> Imprint | `jm1pub_title.jm1_imprint` links certified PROGRAM-002 imprint |
| Title -> Project | `jm1pub_title.jm1_project` links active project where applicable |
| Title -> Royalty Profile | `jm1pub_title.jm1_royaltyprofile` links royalty rules/readiness |

If co-author, editor, illustrator, contributor, or rights-holder relationships must be represented later, create a governed relationship/junction model rather than overloading `jm1_primaryauthor`.

## Current Operational Status

| Area | Status |
|---|---|
| Enterprise Adoption | Operational / complete as migration milestone |
| Enterprise Coverage | Operational as adoption coverage, but not author-roster authority |
| Published Author Count | Provisional until Dataverse Contact/title readback |
| Author/title roster | Blocked pending Dataverse canonical relationship validation |
| Workstream 1 imprint review | Paused until roster source is corrected |
| Contract reconciliation | Not started; requires Dataverse title/contact base |
| Stripe migration | Not started; requires canonical Contact roster |
| Royalty automation | Not started; requires canonical Contact/title/royalty model |

## Next Step

Create a read-only Dataverse Author/Title Roster Validation run:

- Export `jm1pub_titleid`, title name, ISBN fields, `jm1_primaryauthor`, `jm1_primaryauthorname`, `jm1_author`, `jm1_authorname`, `jm1pub_contract`, `jm1_contract`, `jm1_project`, `jm1_imprint`.
- Export Contact IDs/names for referenced `jm1_primaryauthor` rows.
- Produce match status by title:
  - `VALID_CONTACT_TITLE_LINK`
  - `MISSING_PRIMARY_AUTHOR_CONTACT`
  - `DUPLICATE_CONTACT_REVIEW_REQUIRED`
  - `TITLE_RECORD_MISSING`
  - `CONTRACT_LINK_MISSING`
- Rebuild the published author roster only from that Dataverse readback.

Do not use `books.json` as the governing source again.
