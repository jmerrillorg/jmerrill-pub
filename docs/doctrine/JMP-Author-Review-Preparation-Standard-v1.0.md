# JMP Author Review Preparation Standard v1.0

## Purpose

JMP Author Review Preparation Standard v1.0 governs the transformation from an Internal Editorial Working Manuscript into an Author Review Manuscript.

The internal manuscript remains the system of record. The author receives only the prepared Author Review Manuscript.

## Flow

Internal Editorial Working Manuscript

Author Review Preparation

Author Review Manuscript

ECR

ACS

## Internal Editorial Working Manuscript

An Internal Editorial Working Manuscript may contain:

- publisher review notes
- legal reminders
- workflow notes
- automation metadata
- artifact IDs
- correlation IDs
- execution state
- QA markers
- production references
- internal comments

Internal Editorial Working Manuscripts are never author-facing.

## Author Review Manuscript

An Author Review Manuscript may contain:

- editorial edits
- author comments
- track changes
- accepted editorial formatting
- author-facing editorial memo references

An Author Review Manuscript must never contain:

- automation metadata
- publisher-only notes
- correlation IDs
- artifact IDs
- checksums
- execution state
- internal legal workflow
- internal QA
- system identifiers
- production-only comments

## Transformation Rules

The governed preparation engine must:

1. Preserve editorial edits.
2. Preserve intended author comments.
3. Remove internal comments.
4. Remove publisher review notes.
5. Remove workflow metadata.
6. Remove automation metadata.
7. Remove execution identifiers.
8. Remove correlation identifiers.
9. Remove artifact references.
10. Preserve formatting outside removed internal material.
11. Preserve pagination unless the stage requires regeneration.
12. Produce a clean DOCX.

## Validation

The prepared Author Review Manuscript must fail closed unless all checks pass:

- Opens: PASS
- Corruption: NONE
- Track changes: Expected
- Author comments: Expected
- Internal comments: 0
- Publisher notes: 0
- Automation metadata: 0
- Correlation IDs: 0
- Artifact IDs: 0
- Execution state: 0
- Visible QA markers: 0

## Package Boundary

The author review package may include only:

1. Author Review Manuscript
2. Author Review Notes, when applicable
3. Review Instructions PDF

The package must not include manifests, Markdown, JSON, ledgers, execution evidence, internal records, gate records, response records, Dataverse exports, SharePoint inventories, or portal-only instructions.

Portal access remains optional. Author response by direct email reply to `publishing@jmerrill.one` remains canonical.
