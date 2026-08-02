# Human-First Client-Facing Surface Audit

**Method:** Repository and governed-evidence review of current external surfaces, forms, portals, communications, approval paths, and known active service lanes.

Classification values:

- HUMAN_FIRST_ALIGNED
- SIMPLIFICATION_REQUIRED
- SYSTEM_LANGUAGE_EXPOSED
- PORTAL_DEPENDENCY_EXCESSIVE
- HUMAN_FALLBACK_MISSING
- CLIENT_SERVICE_BLOCKED
- RETIRE_OR_REPLACE

| # | Brand / Entity | Surface | Audience | Human need | Why interaction exists | Current experience | Required action | Portal dependency | Human fallback | Technical language exposure | Usability result | Risk | Owner | Classification |
|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | J Merrill Publishing | Public homepage | Authors / readers | Understand trust and purpose | Invite authors and readers into JMP | Why-First doctrine exists; public flow is directionally aligned | Keep as-is; verify after future edits | None | Contact path | Low | PASS | Low | PUBLISHING_OPERATIONS | HUMAN_FIRST_ALIGNED |
| 2 | J Merrill Publishing | About / publishing pages | Authors | Understand stewardship and rights | Explain why JMP exists | Why-First doctrine applies; deeper pages may still overexplain process | Simplify any remaining system-first sections | None | Contact path | Medium | PASS WITH WATCH | Medium | PUBLISHING_OPERATIONS | SIMPLIFICATION_REQUIRED |
| 3 | J Merrill Publishing | Packages / services pages | Authors | Know options without feeling sorted by system | Help author choose next step | Risk of package/catalog language preceding author need | Reorder to why, fit, next human conversation | None | Contact path | Medium | NEEDS COPY QA | Medium | PUBLISHING_OPERATIONS | SIMPLIFICATION_REQUIRED |
| 4 | J Merrill Publishing | Join intake | Prospective authors | Tell JMP about book | Start relationship | Intake exists and is necessary; must remain warm and clear | Keep; verify errors are human-readable | None | Publishing email / phone | Low | PASS WITH WATCH | Medium | PUBLISHING_OPERATIONS | HUMAN_FIRST_ALIGNED |
| 5 | J Merrill Publishing | Intake acknowledgement email | Prospective authors | Know submission was received | Reduce anxiety after inquiry | Past evidence shows acknowledgement recovery work | Keep human-first template and fallback | None | Publishing email / phone | Low | PASS WITH WATCH | Medium | PUBLISHING_OPERATIONS | HUMAN_FIRST_ALIGNED |
| 6 | J Merrill Publishing | Author package delivery email | Active authors | Receive usable review materials | Move current publishing stage forward | Previously overfit to portal/package machinery | Use simplified email-first package | Optional only | Reply email / phone | High before reset | ACTIVE REMEDIATION | High | PUBLISHING_OPERATIONS | SIMPLIFICATION_REQUIRED |
| 7 | J Merrill Publishing | Author Operating Center | Active authors | See status/history/downloads | Support, not replace, human service | Risk of becoming mandatory for ordinary review | Keep optional; never block email reply path | Optional unless justified | Publishing email / phone | Medium | PASS AFTER POLICY | High | PUBLISHING_OPERATIONS | PORTAL_DEPENDENCY_EXCESSIVE |
| 8 | J Merrill Publishing | Approval workflow | Active authors | Approve, ask questions, request corrections | Capture author decision | Gate model valid internally; response must be simple externally | Accept email reply as valid response path | Optional | Publishing email / phone | Medium | PASS AFTER POLICY | High | GOVERNANCE | SIMPLIFICATION_REQUIRED |
| 9 | J Merrill Publishing | Document delivery / attachments | Active authors | Open the files and review | Deliver work product | Recent failures showed technical acceptance is insufficient | Require file-open and attachment tests | None | Direct resend by email | High | ACTIVE REMEDIATION | Critical | PUBLISHING_OPERATIONS | CLIENT_SERVICE_BLOCKED |
| 10 | J Merrill Publishing | Publishing support mailbox | Authors / clients | Get help | Human fallback | Canonical mailbox defined | Keep primary fallback visible | None | Yes | Low | PASS | Low | PUBLISHING_OPERATIONS | HUMAN_FIRST_ALIGNED |
| 11 | J Merrill Publishing | Publisher Operating Center | Staff | See queues and exceptions | Internal operating truth | Staff-facing, not client-facing | Keep internal; avoid leaking terms to clients | Internal | Staff escalation | Medium | PASS | Medium | PUBLISHING_OPERATIONS | HUMAN_FIRST_ALIGNED |
| 12 | J Merrill Financial | Scheduling / Bookings | Clients | Book time and receive clear appointment | Client service | Calendar authority was repaired in prior evidence | Keep client-facing calendar simple; monitor | None | Phone / email | Low | PASS WITH WATCH | Medium | FINANCIAL | HUMAN_FIRST_ALIGNED |
| 13 | J Merrill Financial | Payment / financial setup communications | Clients / authors | Complete setup safely | Required financial operations | Risk of over-systemized instructions | Plain-language templates; no hidden prerequisites | Only if legally required | Direct support | Medium | NEEDS REVIEW | High | FINANCIAL | SIMPLIFICATION_REQUIRED |
| 14 | J Merrill Foundation | Public website / inquiry | Donors / community | Understand mission and support path | Mission engagement | Dependency assessment complete; live copy not fully reviewed here | Why-First review before further changes | None | Direct email / phone | Unknown | REVIEW REQUIRED | Medium | FOUNDATION | SIMPLIFICATION_REQUIRED |
| 15 | J Merrill Foundation | Intake / assistance forms | Applicants / partners | Ask for help clearly | Service request | Not fully verified in current repo scope | Audit form copy and fallback | None unless justified | Direct support | Unknown | REVIEW REQUIRED | Medium | FOUNDATION | HUMAN_FALLBACK_MISSING |
| 16 | J Merrill One | Corporate website / contact | Partners / clients | Understand enterprise and contact human | Corporate trust | Why-first standard applies | Review for technology-first language | None | Direct email / phone | Medium | NEEDS REVIEW | Medium | JM1 | SIMPLIFICATION_REQUIRED |
| 17 | J Merrill Productions | Active public surface | Visitors / clients | Understand status and offering | Productions presence | Production app remains GATE-W3 administrative exception; no live traffic should depend on it | Maintain administrative exception; provide alternate human contact if referenced | None authorized | Direct human fallback required | Unknown | HELD | Medium | PRODUCTIONS | HUMAN_FALLBACK_MISSING |
| 18 | Agape International Cathedral | Public web / member support | Congregants / visitors | Worship and community information | Separate legal/operational body | Separate boundary; only include where JM1 systems support it | Review separately with AIC authority | Avoid mandatory portal unless needed | Church contact path | Unknown | REVIEW REQUIRED | Medium | AIC | SIMPLIFICATION_REQUIRED |
| 19 | J Merrill Publishing | Newsletter signup | Readers / supporters | Subscribe simply | Relationship-building | API exists; user copy needs simple error path | Verify success/error language | None | Contact path | Low | NEEDS QA | Low | PUBLISHING_OPERATIONS | HUMAN_FIRST_ALIGNED |
| 20 | J Merrill Publishing | Partner application | Partners | Apply or inquire | Business relationship | Application route exists | Ensure human follow-up expectation is clear | None | Email / phone | Low | NEEDS QA | Low | PUBLISHING_OPERATIONS | HUMAN_FIRST_ALIGNED |
| 21 | J Merrill Publishing | Author onboarding | Authors | Join without confusion | Post-acceptance onboarding | Risk of portal/account flow becoming prerequisite without support | Simplify instructions and provide fallback | Conditional | Publishing support | Medium | NEEDS REVIEW | High | PUBLISHING_OPERATIONS | PORTAL_DEPENDENCY_EXCESSIVE |
| 22 | J Merrill Publishing | Author recovery / activation | Authors | Restore access | Account recovery | Carolyn evidence shows recovery can block human access | Keep governed, but make human support explicit | Conditional | Publishing support | Medium | ACTIVE WATCH | High | PUBLISHING_OPERATIONS | HUMAN_FALLBACK_MISSING |
| 23 | J Merrill Publishing | Books / authors catalog | Readers / authors | Browse real work | Build trust | Public catalog is appropriate if current | Keep; avoid internal identifiers | None | Contact path | Low | PASS WITH WATCH | Low | PUBLISHING_OPERATIONS | HUMAN_FIRST_ALIGNED |
| 24 | J Merrill Publishing | Privacy / terms | Visitors | Understand legal boundaries | Required disclosure | Legal pages can be formal | Keep; provide contact for questions | None | Contact path | Low | PASS | Low | GOVERNANCE | HUMAN_FIRST_ALIGNED |
| 25 | Enterprise | Automated notices | All external audiences | Understand action required | Transaction support | Risk of provider/system language leaking | Apply standard before any send | None unless justified | Human reply path | Medium | NEEDS TEMPLATE QA | High | GOVERNANCE | SYSTEM_LANGUAGE_EXPOSED |

## Counts

- Client-facing surfaces reviewed: 25
- Human-first aligned: 8
- Simplification required: 8
- System language exposed: 1
- Portal dependency excessive: 2
- Human fallback missing: 3
- Client service blocked: 1
- Retire or replace: 0
- Other / not applicable: 2
- Total primary classifications: 25

## Count Reconciliation

The headline counts are primary classifications; secondary findings are not double-counted.

| Classification | Count |
|---|---:|
| HUMAN_FIRST_ALIGNED | 8 |
| SIMPLIFICATION_REQUIRED | 8 |
| SYSTEM_LANGUAGE_EXPOSED | 1 |
| PORTAL_DEPENDENCY_EXCESSIVE | 2 |
| HUMAN_FALLBACK_MISSING | 3 |
| CLIENT_SERVICE_BLOCKED | 1 |
| RETIRE_OR_REPLACE | 0 |
| OTHER / NOT APPLICABLE | 2 |
| TOTAL | 25 |

The two OTHER / NOT APPLICABLE surfaces are staff/internal or separate-authority surfaces that are included for boundary awareness but are not counted as direct JM1 client-facing completion surfaces:

- J Merrill Publishing - Publisher Operating Center: internal staff surface; secondary risk is client terminology leakage.
- Agape International Cathedral - Public web / member support: separate authority; JM1 may support systems, but AIC review must be separately authorized.

## Blocked Client-Facing Surface

| Field | Value |
|---|---|
| Brand/entity | J Merrill Publishing |
| Surface/workflow | Document delivery / attachments for author-review packages |
| Affected person or audience | Active Publishing authors in the five-title recovery cohort |
| Current failure | Prior technical send acceptance did not prove usable branded email, correct attachments, attachment openability, or email-first response path |
| Human impact | Authors could be asked to review but not receive usable materials or a clear non-portal response path |
| Immediate workaround | Send simplified branded email with directly attached, tested author-facing documents and allow reply to `publishing@jmerrill.one` |
| Permanent remediation | Author Experience Reset in PROGRAM-006, file-open tests, direct reply path, internal-artifact exclusion guard, and operational delivery certification |
| Owner | PUBLISHING_OPERATIONS with ENGINEERING support for deployed guardrails |
| Target date | 2026-08-03 for five-title recovery execution |
| Current status | ACTIVE RECOVERY; not complete until usable emails are sent and certified per title |
