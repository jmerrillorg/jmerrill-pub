# Author-Facing Communication Inventory

## Completed Source Controls

Shared renderer:

- File: `lib/server/author-communication-brand.ts`
- Template family: `JM1_AUTHOR_COMMUNICATION`
- Required blocks: branded header, greeting, why-first explanation, completed work, author impact, author action, primary action, next steps, support, governed footer
- Plain-text fallback: required
- HTML body: required
- Unsupported markup blocked: script, link, iframe, form
- Checksum metadata: SHA-256 for HTML and plain text

Package notification engine:

- File: `lib/server/author-package-notification-engine.ts`
- Template: `AUTHOR_REVIEW_PACKAGE_NOTIFICATION_V1`
- Version: `1.0.0`
- Applies to Developmental Editing, Line Editing, Copyediting, Proofreading, Interior Layout, Cover Design, Production Proof, and Editorial Review package notifications
- ACS send now requires branded HTML and plain text
- Existing From/Reply-To/archive policy remains enforced

## Template Inventory

| Template | Current disposition | Source control status |
| --- | --- | --- |
| Inquiry acknowledgment | NEEDS BRAND REMEDIATION | ACS relay currently separate from package renderer |
| Manuscript received | NEEDS BRAND REMEDIATION | Intake/acknowledgment path needs renderer adoption |
| Editorial review / publishing recommendation | PARTIALLY COMPLIANT | Diagnostic runner already has branded editorial recommendation template |
| Acceptance | NEEDS INVENTORY | No complete source adoption proven in this pass |
| Decline | NEEDS INVENTORY | No complete source adoption proven in this pass |
| Contract/onboarding | NEEDS BRAND REMEDIATION | Agreement package relay needs renderer adoption |
| Developmental Editing package | COMPLIANT FOR PACKAGE NOTIFICATION | Routed through shared renderer after this change |
| Line Editing package | COMPLIANT FOR PACKAGE NOTIFICATION | Routed through shared renderer after this change |
| Copyediting package | COMPLIANT FOR PACKAGE NOTIFICATION | Routed through shared renderer after this change |
| Proofreading package | COMPLIANT FOR PACKAGE NOTIFICATION | Routed through shared renderer after this change |
| Interior Layout review | COMPLIANT FOR PACKAGE NOTIFICATION | Routed through shared renderer after this change |
| Cover review | COMPLIANT FOR PACKAGE NOTIFICATION | Routed through shared renderer after this change |
| Final proof | COMPLIANT FOR PACKAGE NOTIFICATION | Production proof package type routed through renderer |
| Publication approval | NEEDS INVENTORY | No complete source adoption proven in this pass |
| Metadata approval | NEEDS INVENTORY | No complete source adoption proven in this pass |
| Release notification | NEEDS INVENTORY | No complete source adoption proven in this pass |
| Delay or exception communication | NEEDS BOTH | Needs governed branded exception template |
| Reminder | NEEDS BOTH | Needs governed branded reminder template |
| Recovery/activation | NEEDS BRAND REMEDIATION | Author activation PR is separate; renderer adoption not changed here |
| Author portal invitation | NEEDS BRAND REMEDIATION | Requires separate activation/recovery branch integration |

