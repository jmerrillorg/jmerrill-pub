# Human-Friction Inventory

Scope: J Merrill Publishing only
Date: 2026-08-06
Mode: Read-only inventory

## Structures Inspected

| Structure | Finding |
| --- | --- |
| `Implementation HQ/01_GOVERNANCE` | Contains authoritative agreement template location. Human discoverability depends on knowing this path. |
| `Implementation HQ/01_GOVERNANCE/Agreement Templates` | Contains the two current operational agreement templates. This is suitable as the governed source. |
| `docs/operations` | Contains the canonical Operating Manual and many operational/evidence files. Human entry point was not obvious. |
| `docs/operations/active` | Contains an active title current-state structure. Useful for a human current-work view when consistently maintained. |
| `docs/governance/publishing` | Contains the current author-copy policy. Suitable as the policy source. |
| `docs/architecture` and generated architecture references | Contains current Product Form, title lifecycle, commercial catalog, and pricing authority. Necessary reference, but too technical for daily operators. |
| `docs/implementation` | Contains support references for royalty, closeout, and historical work. Useful as reference, not a normal operating path. |
| `docs/operations/generated` | Contains evidence, proofs, generated packages, and old active-looking files. High friction for successors. |
| `06_Session_Archive` | No normal operating dependency identified. Treat as reference-only if present outside the repository. |
| `08_PROJECTS` | No normal operating dependency identified in this repository path. Treat project material as reference-only unless indexed. |

## Friction Categories

| Category | Evidence | Remediation |
| --- | --- | --- |
| HUMAN_ENTRY_POINT_MISSING | Operators had to know where to look across operations, governance, architecture, implementation, active title folders, and generated evidence. | Created the Successor Operations Hub as the first publishing operating entry point. |
| CURRENT_AUTHORITY_NOT_OBVIOUS | Current agreement templates, manual, author-copy policy, catalog registers, and title references lived in different structures. | Created a Current Authority Index and Forms and Templates index. |
| SOP_MISSING | The Operating Manual explained the business but did not provide twenty step-by-step operational SOPs. | Created twenty SOPs with common structure. |
| ROLE_RESPONSIBILITY_UNCLEAR | Future delegation roles were implied but not grouped by role. | Created seven role playbooks. |
| MULTIPLE_ACTIVE_LOOKING_VERSIONS | Generated agreement copies, old package materials, generated catalog files, and title package drafts can appear usable. | Added high-risk active-looking item list and legacy boundary. |
| TECHNICAL_LANGUAGE_EXPOSED | Daily operators would otherwise need to read architecture or implementation material. | Isolated technical support references and kept ordinary steps business-first. |
| DECISION_PATH_UNCLEAR | Decision ownership was spread across manual content and prior records. | Created a plain-English Decisions and Approvals guide. |
| CONTINUITY_DEPENDS_ON_JACKIE | Two-week absence guidance existed conceptually but not as a direct playbook. | Created Jackie Unavailable: Two-Week Operating Playbook. |

## Missing Human Operating Experience

- One visible place to start.
- A daily current-work prompt.
- Consistent SOP structure.
- A forms and templates index with current operational templates.
- A decision-owner guide.
- Role-based delegation pages.
- A two-week absence playbook.
- A legacy boundary rule.
- A curated reference library that avoids archive browsing.

