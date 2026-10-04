# Ghostwriting authority reconciliation - 2026-10-01

Founder direction: Ghostwriting Services is an active manuscript-development capability before, not inside, the 16-stage publishing lifecycle. A ghostwriting fee and a publishing-package fee are separate unless a current executed agreement explicitly combines them. Manuscript acceptance is the handoff gate into the existing publishing pipeline; no second publishing pipeline is authorized.

## Live catalog readback

All five records are active, public, and contractable in production Dataverse `jm1pub_commercialcatalogitems`. The four fixed-price records are quotable. Anthology is SOW-gated and has no fixed unit price. The live records cite the August 5, 2026 Slice 2 commercial catalog authority, rather than only the May price list. These are current *catalog prices*, not a substitute for client-specific executed terms.

| SKU | Current name | Word range | Live catalog price | Current description / scope evidence |
| --- | --- | --- | --- | --- |
| `JMP-GHOST-SHORT` | Ghostwriting - Short | 10,000-25,000 | $7,500 | Short nonfiction, devotionals, ministry booklets, memoir. |
| `JMP-GHOST-STANDARD` | Ghostwriting - Standard | 25,000-50,000 | $15,000 | Full-length nonfiction, faith-based books, memoir, self-help. |
| `JMP-GHOST-EXTENDED` | Ghostwriting - Extended | 50,000-75,000 | $25,000 | Extended nonfiction, trade books, comprehensive ministry and leadership titles. |
| `JMP-GHOST-PREMIUM` | Ghostwriting - Premium | 75,000-100,000 | $35,000 | Major trade books, legacy projects, flagship ministry titles. |
| `JMP-GHOST-ANTHOLOGY` | Anthology Development & Coordination | Scope-defined | Approved quote/SOW | Contributor intake, agreements, editorial coordination, compilation, and production require project-specific scope. |

Source: production catalog readback on October 1, 2026; `docs/architecture/generated/JMP-CATALOG-RECONCILIATION-FINAL-2026-08-05/01-final-120-row-catalog-register.csv`; and the October 1 successor catalog handoff. No retirement or price change was performed by this reconciliation.

## Authority gaps

The catalog does not define any SKU's detailed deliverables, revision count or rounds, payment terms, ownership/IP transfer, confidentiality, client/ghostwriter credit, or manuscript acceptance criteria. No current ghostwriting-specific agreement or commissioned workflow was established in the Publishing repository or the current legal/template folders examined. These terms must come from a governed agreement/SOW and cannot be inferred from word range or price. Anthology's contributor rights and credits need explicit project-specific terms.

The public packages page previously claimed a combined Ghostwriting + Publishing Bundle and a 10% publishing discount for contracts within 90 days. No matching current commercial authority was found in the live catalog or approved register. The public claim has therefore been removed from source; this is not a ruling that a separately approved client-specific discount can never exist.

## Handoff contract

Target sequence: inquiry -> ghostwriting discovery -> ghostwriting agreement -> source/interview collection -> outline approval -> drafting -> client revision -> manuscript acceptance -> existing 16-stage publishing pipeline.

The existing Publishing intake path can accept a manuscript, but no commissioned ghostwriting workflow or automatic manuscript-acceptance-to-publishing handoff was found. Until commissioned, `GHOSTWRITING_TO_PUBLISHING_HANDOFF` is **NOT_PROVEN**, not PASS. A future handoff must bind the accepted manuscript, exact client/author/title identity, agreement and acceptance evidence to a new or existing canonical Publishing engagement without creating a second pipeline or presuming a publishing package purchase.

## Status

`GHOSTWRITING_SERVICES=ACTIVE_CAPABILITY` (commercial catalog)

`GHOSTWRITING_CATALOG_AUTHORITY=PARTIAL` (SKU/status/name/price proven; detailed contract terms unproven)

`GHOSTWRITING_TO_PUBLISHING_HANDOFF=NOT_PROVEN` (target contract established; live runtime uncommissioned)
