# OP-000 Pipeline Adoption, Recovery & Catalog Certification

Status: operational design candidate

Program: PROGRAM-002 Autonomous Publishing Production Pipeline

## Purpose

OP-000 is the official entry point for legacy, active, and published J Merrill Publishing titles entering PROGRAM-002.

Every title managed by J Merrill Publishing becomes PROGRAM-002 certified. Existing titles do not restart the `/join` lifecycle. OP-000 certifies the current state, creates or links required operational assets, records historical evidence, and resumes the title at the appropriate governance gate.

## Adoption Tracks

### Track A - Active Pipeline Adoption

Use Track A for titles currently in Editorial, Production, Distribution, or Marketing.

The adoption process:

1. Determine current stage.
2. Verify completion evidence already present.
3. Create or link the canonical SharePoint workspace.
4. Create or link the Author Workspace.
5. Create safe execution-history events.
6. Certify completed stages.
7. Resume at the current governance gate.

Track A never repeats completed production work and never forces the title back through `/join`.

### Track B - Published Author Workspace Adoption

Use Track B for titles already distributed and authors currently receiving royalties.

The adoption process creates a Published Author Workspace without forcing the author through `/join`.

Import or link:

- author
- titles
- ISBNs
- contracts
- royalty configuration
- payment preference
- distribution status
- retailer links
- final production assets
- SharePoint workspace
- royalty history
- statements
- tax information where applicable

Relationship State: `Active Author`

Workspace Mode: `Published Author Workspace`

Visible modules:

- Dashboard
- Published Titles
- Royalty Reports
- Payments
- Contracts
- Files
- Marketing Assets
- Author Copies
- Support
- New Title Submission

Existing data should be imported or linked first. The workspace shows only missing author actions, such as reviewing mailing address, royalty payment preference, or tax information.

### Track C - Catalog Certification

Use Track C to certify every title against current JM1 Publishing canon.

Certification verifies:

- metadata
- ISBNs
- files
- contracts
- royalty terms
- distribution
- marketing assets
- production assets
- author relationship
- workspace
- execution history
- imprint
- JM Signature review

## Imprint Certification

Every title must have one certified governing imprint.

The current canon classification engine is run against every title.

Normal path:

`Classification Engine -> Assign Imprint -> Lock Imprint -> Continue`

Publisher review is not required unless an exception is present:

- confidence below threshold
- conflicting classifications
- doctrine conflict
- Publisher override requested
- potential JM Signature candidate

JM Signature remains a curated Publisher decision. If the engine recommends JM Signature, the system presents the current imprint, recommended JM Signature, and supporting rationale. Jackie chooses either `Promote to JM Signature` or `Keep current imprint`. Nothing changes automatically.

## Publisher-Certified Automation

Publisher-certified automation is canon for OP-000.

If a decision is governed by approved JM1 doctrine and historically accepted by Jackie in the overwhelming majority of cases, the system executes the decision automatically.

Examples:

- imprint assignment
- metadata validation
- workflow routing
- stage certification

Publisher review is exception-driven and occurs only for low confidence, doctrine conflicts, exceptions, JM Signature, or explicit Publisher override.

## Legacy Execution History

Imported titles must not appear as if they were produced today.

OP-000 creates historical execution events with safe provenance.

Example events:

- Imported into PROGRAM-002
- Editorial completed, source: Legacy JMP
- Cover approved, source: Legacy JMP
- Distribution completed, source: Legacy JMP
- Certified by Jackie Smith Jr.

Execution history preserves evidence without replaying work.

## Author Workspace

Every adopted author receives one Author Workspace.

Rules:

- New author: create one Author Workspace.
- Returning author: add the title to the existing Author Workspace.
- Published author: use Published Author Workspace mode.
- Do not duplicate author workspaces.
- Do not expose unnecessary onboarding if information already exists.
- Show only missing author actions.

## SharePoint

Create or link the canonical workspace.

If one already exists, reuse it. Do not duplicate it.

SharePoint remains the file/workspace layer. Dataverse remains the system of record.

Folder movement follows PROGRAM-002 doctrine: a workspace location represents the last successfully completed governance gate, not the stage currently being attempted.

## Execution Log Events

Record safe evidence in `jm1_executionlog` where practical:

- adoption started
- certification started
- certification completed
- imprint assigned
- imprint locked
- JM Signature review if applicable
- workspace created or linked
- relationship state assigned
- title stage assigned
- migration completed

Do not store manuscript text, raw model output, secrets, payment data, bank/tax details, full provider responses, or sensitive private content in execution logs.

## Validation Checklist

Validate OP-000 against existing JMP titles:

- in-flight title adoption
- published title adoption
- workspace creation
- workspace linking
- SharePoint linking
- imprint assignment
- automatic imprint locking
- JM Signature review path
- execution history creation
- duplicate prevention

Confirm:

- no existing title is forced back through `/join`
- no production work is repeated
- no duplicate workspaces
- no duplicate contracts
- no duplicate royalty records

## Boundaries

OP-000 does not:

- create a new architecture
- treat SharePoint as system of record
- recreate existing Contacts, contracts, royalties, or workspaces when a canonical record exists
- repeat completed editorial, cover, layout, distribution, launch, royalty, or author-success work
- send author/customer communications without the appropriate operational gate
- touch Stripe, Business Central postings, royalties, or author payments
