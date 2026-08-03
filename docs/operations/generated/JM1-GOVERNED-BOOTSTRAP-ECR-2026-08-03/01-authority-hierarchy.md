# Authority Hierarchy

## Governed Order

1. Merged repository canon on `origin/main`.
2. Verified runtime configuration.
3. Current initiative handoff.
4. Conversation context.

Conversation context cannot override merged canon or verified live state.

## Bootstrap Responsibility

The bootstrap loads authority, runtime policy, repository canon, initiative state, approval state, protected mutation permission, conflict state, and allowed or prohibited actions.

## ECR Responsibility

The Enterprise Communication Renderer renders governed content only. It owns layout, brand tokens, typography, spacing, content components, buttons, signatures, HTML body, and plain-text body.

The ECR cannot independently authorize a communication. It fails closed with `ECR_EXECUTION_AUTHORITY_MISSING` unless render authority is supplied by JM1 Governed Bootstrap.

## Delivery Provider Responsibility

ACS owns transmission of already-rendered communications, sender, Reply-To, archive visibility, attachments, and provider evidence.

No communication was sent during this evidence run.
