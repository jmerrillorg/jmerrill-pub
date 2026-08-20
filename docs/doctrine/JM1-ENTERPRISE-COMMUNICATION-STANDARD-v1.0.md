# JM1 Enterprise Communication Standard v1.0

Status: CANON
Owner: J Merrill One

## Principle

No workflow, automation, relay, Dynamics email, or future communication engine may invent its own outbound layout. Every outbound communication must render through the JM1 Enterprise Communication Renderer or an approved adapter that proves equivalent component output.

## Components

The governed component sequence is:

1. Brand Header
2. Hero
3. Greeting
4. Reason
5. Summary
6. Attachments
7. Actions
8. Timeline
9. Support
10. Signature
11. Footer

The brand supplies logo or lockup, brand identifier, division line, contact information, and promise line. The renderer supplies typography, spacing, layout, buttons, responsive behavior, accessibility, signature format, footer, and brand consistency.

## Tokens

JM1 Navy, JM1 Gold, JM1 Gray, JM1 White, and JM1 Blue CTA are the canonical color roles. Workflows do not choose colors directly.

Typography roles are Heading XL, Heading L, Heading M, Body, Caption, and Metadata. Workflows do not choose fonts or ad hoc heading sizes.

## Publishing Canon

Publishing author-facing communication uses:

- Sender: `publishing@email.jmerrill.one`
- Reply-To: `publishing@jmerrill.one`
- Archive mailbox: `publishing@jmerrill.one`
- Delivery: ACS governed relay
- Primary author experience: email
- Portal: optional and secondary
- Internal artifacts: prohibited

The governed Publishing signature is:

```text
The Publishing Team
J Merrill Publishing, Inc.
A Division of J Merrill One
614.965.6057 · publishing@jmerrill.one · jmerrill.pub
Helping Authors Help Themselves.
```

The brand name may appear only as a restrained identity header or approved logo/lockup. It must not render as the message H1.

## Communications Evidence Routing

Microsoft 365 is the primary business-communications evidence authority for J Merrill One. Connector availability does not determine evidence authority.

When investigating a JM1 business communication, use this evidence-source order:

1. Relevant Microsoft 365 shared or organizational mailbox
2. Other relevant JM1 Microsoft 365 mailbox
3. Dynamics or Dataverse communication and operational records
4. SharePoint or OneDrive governed project evidence
5. Repository or evidence artifacts
6. External or personal email source only when concrete evidence identifies that source as part of the actual thread

For Publishing author communications, begin with the governed Publishing mailbox:

```text
publishing@jmerrill.one
```

An author's Gmail address as recipient does not make a JM1 Gmail connector the governed source. If JM1 sent from `publishing@jmerrill.one` or internally mirrored to that mailbox, the governed evidence source remains Microsoft 365 / Outlook for the Publishing mailbox.

Do not search Gmail as a generic fallback. Gmail may be used only when Jackie identifies Gmail as the source, project evidence identifies a Gmail mailbox as part of the business thread, the project is historical and predates the governed Microsoft mailbox, Microsoft evidence identifies a cross-platform communication requiring Gmail verification, or another concrete fact makes Gmail relevant.

Evidence investigations should ask: "What is the governed JM1 system most likely to own this event?" They should not ask: "Which connected connector can be searched?"

## Prohibited

- Workflow-specific HTML
- Process-specific formatting
- Invented closings such as `Warmly, J Merrill Publishing`
- Gmail or Outlook as a release path without an approved exception
- Internal manifests, ledgers, workflow records, or evidence files in author-facing attachments
