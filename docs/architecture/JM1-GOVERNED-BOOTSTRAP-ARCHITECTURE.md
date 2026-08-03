# JM1 Governed Bootstrap Architecture

The governed bootstrap is a repository-local authority loader. It creates a current execution manifest from merged canon, git state, runtime configuration, and initiative handoff records.

## Authority Hierarchy

1. Merged repository canon on `origin/main`
2. Verified runtime configuration
3. Current initiative handoff
4. Conversation context

Conversation context never outranks merged canon or live state.

## Outputs

The bootstrap writes:

- `.bootstrap/current-bootstrap.json`
- `.bootstrap/current-bootstrap.md`

These files are runtime artifacts and are ignored by git unless intentionally preserved as evidence.

## Conflict Classes

The bootstrap emits these conflict codes when detected:

- `CANON_RUNTIME_CONFLICT`
- `CANON_INITIATIVE_CONFLICT`
- `STALE_BRANCH_AUTHORITY`
- `STALE_HANDOFF_RECORD`
- `TITLE_METADATA_CONFLICT`
- `WORKFLOW_STATE_CONFLICT`

No production mutation continues while conflicts are present.

## Communication Integration

The bootstrap, renderer, and delivery provider have separate authority boundaries:

- JM1 Governed Bootstrap determines authority, applicable brand canon, runtime policy, initiative state, approval state, protected mutation permission, conflict state, and allowed or prohibited actions.
- JM1 Enterprise Communication Renderer renders governed content, layout, brand tokens, typography, spacing, components, buttons, signatures, responsive HTML, accessibility-safe structure, and the plain-text companion.
- ACS relay transmits already-rendered communications and owns provider evidence for sender, Reply-To, archive visibility, attachments, and delivery status.

The bootstrap must not become an email template engine. The renderer must not determine operational authority, send a message, start a response clock, or advance a production gate. Rendering fails closed without `executionAuthority.authoritySource === 'JM1 Governed Bootstrap'` and emits `ECR_EXECUTION_AUTHORITY_MISSING`.

The bootstrap loads the JM1 Enterprise Communication Standard and verifies Publishing communication canon before author-facing work:

- ACS sender is `publishing@email.jmerrill.one`
- Reply-To is `publishing@jmerrill.one`
- archive visibility is `publishing@jmerrill.one`
- email is primary
- portal is optional
- internal artifacts exposed equals zero

Gmail and Outlook are noncanonical release paths unless an approved exception exists.
