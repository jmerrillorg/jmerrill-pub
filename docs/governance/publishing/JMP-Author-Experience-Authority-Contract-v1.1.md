# JMP Author Experience & Authority Contract v1.1

Status: CANONICAL GOVERNANCE STANDARD / RATIFIED
Prior version: v1.0 / HELD / SUPERSEDED BY v1.1
Prepared: 2026-09-02
Ratified: 2026-09-02
Stream: JMP Author Platform - Experience & Authority Contract Material Revision
Implementation authority: NO
Runtime authority: NO
Schema authority: NO
Author communication authority: NO

## 1. Revision Basis

Founder review placed `JMP Author Experience & Authority Contract v1.0` on `HOLD_FOR_MATERIAL_REVISION` because its proposed author-facing A0-A5 taxonomy conflicted with the ratified Path B A0-A5 system action authority and was dangerously confusable with existing editorial approval gate codes A1-A9.

This successor standard resolves that material conflict by creating a separate Author Experience namespace: AX0-AX5. It does not redefine Path B A0-A5. It does not rename or reinterpret existing editorial approval gates A1-A9.

## 2. Three-Layer Authority Model

Every author-facing capability must identify three separate authority systems when applicable.

| Layer | Namespace | Governs | Source status |
|---|---|---|---|
| Author Experience Decision Class | AX0-AX5 | What the author-facing interaction means from the author's perspective | This contract, ratified |
| System Action Authority | A0-A5 | What the system or operator is authorized to do under Path B | Path B v0.9, ratified |
| Editorial Approval Gate | Full canonical gate code/name | Which editorial milestone, if any, the author decision concerns | Existing editorial approval gate implementation |

These layers are not interchangeable. A portal action may be AX2 because the author is making a creative/editorial decision. The lifecycle effect may still require Path B A4 or A5 depending on whether the system sends, transitions, publishes, charges, changes rights, or creates another consequential effect. The same action may concern an editorial gate such as `A2 Developmental Completion`, but that does not make AX2 equal to editorial gate A2 or Path B A2.

Unqualified shorthand such as `A2 approval` or `A5 consent` is prohibited where more than one authority namespace could be meant.

## 3. AX Namespace Reservation

AX0-AX5 is reserved for Author Experience decision classification.

AX codes describe what kind of author decision or intent is being expressed. They do not describe system execution authority, editorial stage, security authorization, maturity, or lifecycle state.

The following separations are controlling:

- AX_CLASS != PATH_B_AUTHORITY
- AX_CLASS != EDITORIAL_GATE
- AX_CLASS != SECURITY_TIER
- AX_CLASS != LIFECYCLE_STAGE

## 4. Namespace Rendering Rule

Author Experience decision classes must render as `AX0`, `AX1`, `AX2`, `AX3`, `AX4`, or `AX5`.

Path B system action authority must render as `A0`, `A1`, `A2`, `A3`, `A4`, or `A5` and must be identified as Path B authority where ambiguity is possible.

Editorial approval gates must render using their full canonical code/name, including:

| Editorial Gate | Canonical name |
|---|---|
| A1 | A1 Editorial Review Acceptance |
| A2 | A2 Developmental Completion |
| A3 | A3 Line Editing Completion |
| A4 | A4 Copyediting Completion |
| A5 | A5 Proofreading Completion |
| A6 | A6 Cover Design Approval |
| A7 | A7 Interior Layout Approval |
| A8 | A8 Production Approval |
| A9 | A9 Distribution / Release Approval |

Where ambiguity is possible, identifiers must be qualified.

Preferred forms:

- AX2 - Creative / Editorial Decision
- PathB-A4 - External Execute
- Editorial Gate A2 - Developmental Completion

Ambiguous shorthand such as `A2 approval` or `A5 consent` must not be used without namespace/context.

## 5. AX0-AX5 Taxonomy

| Code | Name | Purpose | Examples | Author intent required | Resource binding required | Artifact binding required | Version binding required | Lifecycle effect possible | Commercial effect possible | Contractual effect possible | Reversibility | Minimum Path B authority | Proof requirement | Security tier requirement |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| AX0 | Informational | Show current JMP truth without asking the author to decide. | View title status; view current milestone; view next expected action. | No | Yes, for scoped views | No unless artifact is shown | No unless artifact is shown | No | No | No | Not applicable | A0 Observe | Projection/read authorization, no mutation proof | Tier 1 for lifecycle/status; Tier 2 blocked for sensitive records |
| AX1 | Acknowledgement | Author confirms receipt or awareness without approving substance. | Acknowledge package delivery; confirm instructions were received. | Yes, receipt/awareness only | Yes | Usually yes if tied to a package | Yes if tied to a package | Evidence-only or timer/cadence effect | No | No | Usually reversible only by adding superseding evidence | A2 Internal Write, A4 if external send occurs | Identity, resource, event, timestamp, package/version, negative proof no approval inferred | Tier 1 unless sensitive content involved |
| AX2 | Creative / Editorial Decision | Author approves, rejects, questions, or requests changes to a defined creative/editorial artifact or outcome. | Approve developmental edit; request line-edit changes; ask clarification on cover concept. | Yes, explicit decision | Yes | Yes | Yes | Transition eligibility possible, not automatic lifecycle authority | No | No, unless the decision is packaged with contractual/public authorization | Superseded by later approved artifact/version or governed correction | A2 for evidence, A4/A5 where lifecycle/external/consequential effect executes | Transition Contract plus Proof Contract; exact artifact/version binding | Tier 1 for editorial artifacts; Tier 2 if contract/financial content included |
| AX3 | Publication Authorization | Author authorizes a defined publication or production outcome. | Approve final proof for print production; authorize publication release after final files. | Yes, explicit publication/production authorization | Yes | Yes | Yes | Direct transition request possible, subject to Transition Contract | Possible if release/pricing/distribution implications exist | Possible when tied to contractual publication authority | Usually not reversible after downstream production without formal correction path | A4 or A5 depending on downstream effect | Strong evidence, confirmation, artifact/version binding, transition proof, negative proof no wrong version | Tier 1 for final artifact approval; Tier 2 if sensitive commercial terms involved |
| AX4 | Commercial Election | Author selects among approved commercial options already presented by JMP. | Accept package offer; choose payment option; select elected product forms if authorized. | Yes, explicit election | Yes | No unless document/package binds terms | Yes for offer/terms version | Commercial effect; lifecycle eligibility possible | Yes | Possible if election creates payment or agreement obligations | Limited; governed correction or superseding offer required | A5 when consequential pricing/payment obligations are created | Offer version, terms version, confirmation, idempotency, commercial authority proof | Tier 2 if payment, contract, pricing, or financial details shown |
| AX5 | Contractual / Consequential Consent | Creates or modifies contractual obligations or legally/financially consequential consent. | Execute publishing agreement; accept amendment; consent to rights/pricing change requiring formal signature controls. | Yes, formal consent | Yes | Yes for contract/addendum/amendment | Yes | Possible after formal consent is completed | Yes | Yes | Governed amendment/addendum/superseding agreement only | A5 Consequential Authority | Approved contractual/e-signature mechanism unless later legal/governance rule permits otherwise | Tier 2 required; legal/security proof required |

AX5 may classify contractual or consequential author intent, but AX5 classification alone does not prove legal sufficiency. AX5 classification does not prove that a valid contract was formed, a legally required signature was captured, a disclosure requirement was satisfied, an electronic-signature requirement was satisfied, payment authorization was valid, or counsel-required consent mechanics were satisfied.

AX5_CLASSIFICATION != LEGAL_SUFFICIENCY.

Where a contract, addendum, rights grant, commercial election, payout action, or other legally consequential act requires a specific acceptance/signature mechanism, that mechanism remains independently required. The separate Legal Review Packet remains authoritative for unresolved legal questions. This governance classification must not be converted into legal advice.

## 6. V1 Action Authority Matrix

| Action ID | AX class | Minimum Path B authority | Editorial gate if applicable | Resource scope | Title binding | Artifact binding | Version binding | Explicit confirmation | Second confirmation | Session required | Security tier | Transition Contract | Proof Contract | Event emitted | Lifecycle effect | Commercial effect | Contractual effect | Idempotency rule | Replay rule | Reversibility | Refusal conditions | Escalation / cadence rule |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| VIEW_TITLE_STATUS | AX0 | A0 Observe | None | Author's authorized title | Yes | No | No | No | No | Yes | Tier 1 | No | Projection proof | AUTHOR_TITLE_STATUS_VIEWED where logged | NO_LIFECYCLE_EFFECT | None | None | Read-only | Replay has no effect | Not applicable | No session, no title relationship, resource not owned | None |
| VIEW_ARTIFACT | AX0 | A0 Observe | Full gate name if artifact is gate-bound | Authorized title artifact | Yes | Yes | Yes | No | No | Yes | Tier 1/Tier 2 by artifact | No | Artifact access proof | AUTHOR_ARTIFACT_VIEWED where logged | NO_LIFECYCLE_EFFECT | None | None | Read-only | Replay has no effect | Not applicable | Artifact missing, superseded, unauthorized, expired URL | None |
| DOWNLOAD_ARTIFACT | AX0 | A0 Observe | Full gate name if artifact is gate-bound | Authorized downloadable artifact | Yes | Yes | Yes | No | No | Yes | Tier 1/Tier 2 by artifact | No | Artifact download proof | AUTHOR_ARTIFACT_DOWNLOADED where logged | NO_LIFECYCLE_EFFECT | None | None | Read-only, evidence log may be idempotent by artifact/version/session | Rebuild access evidence only | Not applicable | Unauthorized, expired URL, artifact/version mismatch | None |
| ACKNOWLEDGE_DELIVERY | AX1 | A2 Internal Write | Full gate name if package-bound | Delivered package | Yes | Yes | Yes | Yes | No | Yes | Tier 1 | No unless cadence/timer changes | Delivery acknowledgement proof | AUTHOR_DELIVERY_ACKNOWLEDGED | EVIDENCE_ONLY or timer/cadence evidence | None | None | One acknowledgement per package/version | Replay returns existing event | Superseding note only | No session, package not delivered, wrong author, stale package | Day-based response cadence remains separate |
| APPROVE_ARTIFACT | AX2 | A2 for evidence; A4/A5 for resulting external/consequential action | Required full gate name, e.g. A2 Developmental Completion | Current artifact under review | Yes | Yes | Yes | Yes | Sometimes, for final/public artifacts | Yes | Tier 1 unless sensitive | Yes | Approval proof | AUTHOR_ARTIFACT_APPROVED | TRANSITION_ELIGIBILITY_EFFECT; possible DIRECT_TRANSITION_REQUEST | None | None unless bundled with publication/contract | One approval per artifact/version/gate | Replay returns existing approval | Superseded by replacement artifact/version or correction path | Wrong author, wrong title, artifact/version mismatch, superseded artifact, gate inactive | Author response cadence controls stale/no-response handling |
| REQUEST_CHANGES | AX2 | A2 Internal Write | Required full gate name if stage-bound | Current artifact under review | Yes | Yes | Yes | Yes, with details | No | Yes | Tier 1 | Yes for revision-loop eligibility | Change-request proof | AUTHOR_CHANGES_REQUESTED | RETURN_TO_PRIOR_STAGE_EFFECT or revision-loop eligibility | None | None | One request event per package/version/submission | Replay preserves original request | Later approval or resolved revision supersedes | Empty detail, stale context, wrong artifact, unauthorized title | Revision cadence per editorial policy |
| REQUEST_CLARIFICATION | AX2 | A2 Internal Write | Full gate name if applicable | Current action/package | Yes | Optional | Optional | Yes, with question | No | Yes | Tier 1 | Maybe | Clarification proof | AUTHOR_CLARIFICATION_REQUESTED | EVIDENCE_ONLY unless policy pauses stage | None | None | Stable event by package/version/question hash | Replay returns existing question | Answer/resolution evidence closes | Empty question, no active context, unauthorized title | Escalate if unanswered per operating cadence |
| PLACE_HOLD | AX2 | A2 Internal Write; A5 if contractual/commercial consequences | Active title/action context | Title/action context | Yes | Optional | Optional | Yes | Sometimes | Yes | Tier 1/Tier 2 by reason | Yes | Hold proof | AUTHOR_HOLD_REQUESTED | HOLD_EFFECT | Possible if schedule/payment impacted | Possible if terms impacted | One active hold per scope/reason | Replay returns active hold | Resume or publisher ruling | No active title, ambiguous scope, forbidden hold, contractual consent unmet | Hold review cadence required |
| RESUME_FROM_HOLD | AX2 | A2 Internal Write; A4/A5 if consequential | Held title/action context | Title/action context | Yes | Optional | Optional | Yes | No | Yes | Tier 1/Tier 2 by scope | Yes | Resume proof | AUTHOR_HOLD_RESUME_REQUESTED | TRANSITION_ELIGIBILITY_EFFECT | Possible | Possible | One resume per hold id | Replay returns existing resume | New hold may supersede | No active hold, wrong author, stale hold, prerequisites missing | Immediate reevaluation after valid resume |
| AUTHORIZE_PUBLICATION | AX3 | A4 External Execute or A5 Consequential Authority | A8 Production Approval or A9 Distribution / Release Approval when applicable | Final publication/release scope | Yes | Yes | Yes | Yes | Yes | Yes | Tier 1 plus Tier 2 where commercial/legal data shown | Yes | Publication authorization proof | AUTHOR_PUBLICATION_AUTHORIZED | DIRECT_TRANSITION_REQUEST subject to Transition Contract | Possible | Possible | One authorization per final artifact/version/release scope | Replay returns existing authorization | Amendment/correction/reversion path only | Missing final proof, version mismatch, security proof unavailable, legal consent unmet | Release cadence and publisher approval apply |
| ACCEPT_COMMERCIAL_OFFER | AX4 | A5 Consequential Authority if payment/contract obligation follows | None | Offer/opportunity/title | Yes | Offer document if present | Offer terms version required | Yes | Usually yes | Yes | Tier 2 | Commercial Transition Contract | Commercial election proof | AUTHOR_COMMERCIAL_OFFER_ACCEPTED | COMMERCIAL_EFFECT and possible transition eligibility | Yes | Possible | One acceptance per offer version | Replay returns existing acceptance | Superseding offer/correction only | Offer expired, price unlocked, wrong author, terms mismatch | Offer expiration/reminder cadence |
| MAKE_COMMERCIAL_ELECTION | AX4 | A5 Consequential Authority if obligation follows | None | Approved option set | Yes | Optional | Terms/options version required | Yes | Usually yes | Yes | Tier 2 | Commercial Transition Contract | Election proof | AUTHOR_COMMERCIAL_ELECTION_RECORDED | COMMERCIAL_EFFECT | Yes | Possible | One current election per option set/version | Replay returns existing election | Governed correction/superseding election | Option unavailable, stale terms, pricing mismatch, identity ambiguity | Commercial follow-up cadence |
| COMPLETE_PAYOUT_ENROLLMENT | AX5 or external provider controlled action | A5 Consequential Authority / provider authority | None | Payout/royalty payee profile | Yes where title/payee scoped | Provider/evidence artifact if applicable | Provider status version | Yes | Provider dependent | Yes/provider session | Tier 2 | No publishing transition by itself | Payout enrollment proof | AUTHOR_PAYOUT_ENROLLMENT_COMPLETED | EVIDENCE_ONLY or royalty readiness effect | Yes for payout readiness | Possible provider consent | One enrollment status per provider account/payee | Replay reconciles provider truth | Provider amendment/update path | Provider mismatch, identity conflict, missing payee authority, security proof unavailable | Reminder cadence separately governed |
| UPDATE_ALLOWED_PROFILE_INFORMATION | AX1 or AX2 depending on field | A2 Internal Write; A5 if legal/payee identity changes | None | Author profile allowed fields | No title unless title-scoped field | No | Field version/audit required | Yes | Sometimes | Yes | Tier 1/Tier 2 by field | No | Profile update proof | AUTHOR_PROFILE_UPDATED | NO_LIFECYCLE_EFFECT | Possible if commercial/legal fields | Possible for legal/payee identity fields | Field-level idempotency by actor/value/version | Replay returns existing update | Corrective update audit | Field not allowed, identity mismatch, sensitive field requires higher proof | Data-quality review cadence |

## 7. Authentication and Authorization Boundary

AUTHENTICATION != AUTHORIZATION.

AUTHENTICATION != AX DECISION.

AUTHENTICATION != A5 PATH-B AUTHORITY.

AUTHENTICATION != EDITORIAL APPROVAL.

AUTHENTICATION != CONTRACTUAL CONSENT.

OTP_VERIFIED != AUTHOR_APPROVAL.

SESSION_CREATED != RESOURCE_AUTHORITY.

EMAIL_MATCH != AUTHOR_PROFILE_AUTHORITY.

AUTHOR_PROFILE_AUTHORITY != AUTHORITY_OVER_ALL_TITLES.

Every consequential author action must resolve server-side through this chain:

1. authenticated identity;
2. canonical Contact;
3. canonical Author Profile;
4. authorized title/resource relationship;
5. exact action requested;
6. exact artifact/version where applicable;
7. valid current transition context;
8. applicable AX class;
9. applicable Path B authority level;
10. applicable editorial gate full code/name if relevant;
11. applicable security tier;
12. applicable Transition Contract and Proof Contract.

A browser-provided title id, artifact id, author id, package id, or action id is only a request input. It is not authority.

## 8. Artifact and Version Binding

Every artifact decision must bind to exact evidence.

Required evidence fields:

| Field | Required meaning |
|---|---|
| AUTHOR_PROFILE_ID | Author profile making the decision |
| CANONICAL_TITLE_ID | Title whose resource is being acted on |
| ARTIFACT_ID | Exact artifact under decision |
| ARTIFACT_VERSION | Exact version/checksum/package version |
| AX_ACTION_CLASS | AX0-AX5 class used |
| DECISION | Actual decision value |
| DECISION_TIMESTAMP | Time the decision occurred |
| SESSION_IDENTITY_EVIDENCE | Authentication/session proof used |
| CORRELATION_ID | System correlation id |
| TRANSITION_CONTRACT_ID | Required where lifecycle effect is possible |

APPROVAL_ARTIFACT_A != APPROVAL_ARTIFACT_B.

APPROVAL_VERSION_1 != APPROVAL_VERSION_2.

APPROVAL_STAGE_X != APPROVAL_STAGE_Y.

REPLACEMENT_ARTIFACT_INVALIDATES_PRIOR_APPROVAL unless canonical governance explicitly says otherwise.

The system must not treat the latest filename, a title-text match, a stale package id, or operator inference as artifact/version approval authority.

## 9. Action Event Immutability

Consequential author-action evidence must retain immutable references to the exact authority context at execution time.

At minimum, preserve:

- AUTHOR_PROFILE_ID
- CANONICAL_TITLE_ID
- ACTION_ID
- AX_CLASS
- PATH_B_AUTHORITY_LEVEL
- EDITORIAL_GATE where applicable
- ARTIFACT_ID where applicable
- ARTIFACT_VERSION where applicable
- DECISION / INTENT
- TIMESTAMP
- CORRELATION_ID
- CAUSATION_ID where applicable
- TRANSITION_CONTRACT_ID where applicable
- PROOF_CONTRACT_REFERENCE where applicable

Subsequent governance, model, taxonomy, or runtime changes must not silently reinterpret historical author decisions.

## 10. Fail-Closed Model

Refuse action when any of the following apply:

- NO_AUTHENTICATED_SESSION
- AMBIGUOUS_CONTACT
- AMBIGUOUS_AUTHOR_PROFILE
- MULTIPLE_ACTIVE_PROFILES_WHERE_ONE_REQUIRED
- RESOURCE_NOT_OWNED
- TITLE_BINDING_MISSING
- ARTIFACT_BINDING_MISSING
- ARTIFACT_VERSION_MISMATCH
- STALE_DECISION_CONTEXT
- SUPERSEDED_ARTIFACT
- ACTION_NOT_ALLOWED_FOR_CURRENT_STAGE
- TRANSITION_PREREQUISITE_MISSING
- REPLAY_DETECTED where replay is not idempotently resolvable
- RECONCILIATION_REQUIRED
- SECURITY_PROOF_UNAVAILABLE
- CONTRACTUAL_CONSENT_REQUIREMENT_UNSATISFIED

On refusal, the system must fail closed and preserve diagnostic evidence. It must not degrade to email-only matching, title-text matching, filename matching, browser-provided ids, or operator inference.

## 11. Manual Intervention Model

Manual intervention may:

- prepare evidence;
- resolve reconciliation;
- correct data under governed authority;
- review an exception;
- restore failed technical state;
- perform separately authorized publisher action.

Manual intervention may not:

- manufacture author consent;
- convert a failed action into valid approval;
- retroactively authorize the wrong artifact or version;
- override resource ownership;
- convert authentication into contractual consent;
- silently promote an AX class or Path B authority level.

Manual intervention required because the system could not perform a responsibility included in an autonomous claim must be recorded under the Proof Contract Standard and may limit maturity classification.

## 12. Security Tier Model

AX maturity is not security authorization.

Governance ratification is not security proof.

Authority contract approval is not runtime proof.

Tier 1 covers identity, title relationship, lifecycle projection, Author Actions, and action-specific artifacts where they do not include sensitive commercial, contractual, payout, royalty, or payment data.

Tier 2 covers contracts, royalty statements, payment information, payout enrollment, sales/commercial information, sensitive PII, and similar protected records.

Tier 2 remains prohibited until its security Proof Contract passes. Tier 2 proof must include cross-author isolation, cross-title enforcement, server-side authorization, direct-object-reference resistance, artifact URL expiration, artifact/version authorization, session expiration/revocation, audit evidence, protected-data logging controls, and environment separation where applicable.

For any Tier 2 capability involving contracts, royalties, payment records, payouts, bank/payment information, financial information, sensitive personal data, rights grants, or other high-consequence author actions, SECURITY_PROOF_CONTRACT = PASS is required before runtime operational activation.

The following separations are controlling:

- AUTHORITY_CONTRACT_RATIFIED != TIER_2_SECURITY_PROVEN
- AX5 != TIER_2_AUTHORIZATION
- PATH_B_A5 != AUTOMATIC_TIER_2_ACTIVATION
- PROOF_CONTRACT_PASS does not itself create consent or legal authority.

## 13. Lifecycle Effect Model

Author action creates evidence. The Transition Contract decides whether lifecycle movement is permitted. Portal action alone must never manufacture lifecycle authority.

| Effect class | Meaning |
|---|---|
| NO_LIFECYCLE_EFFECT | The action does not affect lifecycle. |
| EVIDENCE_ONLY | The action records evidence without making movement eligible. |
| TRANSITION_ELIGIBILITY_EFFECT | The action may satisfy one prerequisite for movement. |
| DIRECT_TRANSITION_REQUEST | The action requests movement, still subject to Transition Contract. |
| HOLD_EFFECT | The action pauses or holds an active context. |
| RETURN_TO_PRIOR_STAGE_EFFECT | The action can create a revision or correction loop. |
| COMMERCIAL_EFFECT | The action affects offer, package, payment, or commercial state. |
| CONTRACTUAL_EFFECT | The action creates or modifies contractual consequence. |
| OTHER | Must be separately defined before use. |

## 14. Event and Proof Model

Every consequential action must define:

- EVENT_NAME;
- EVENT_PAYLOAD;
- AUTHORITY_CONTEXT;
- AX_CLASS;
- PATH_B_AUTHORITY;
- EDITORIAL_GATE_IF_APPLICABLE using full code/name;
- RESOURCE_ID;
- ARTIFACT_ID;
- VERSION;
- CORRELATION_ID;
- CAUSATION_ID;
- PROOF_CONTRACT;
- NEGATIVE_PROOF;
- ROLLBACK / RECOVERY;
- IDEMPOTENCY.

Minimum event payload fields:

| Field | Required |
|---|---|
| eventId | Yes |
| authorProfileId | Yes |
| contactId | Yes where available |
| titleId | Yes for title-scoped actions |
| actionId | Yes |
| axClass | Yes |
| pathBAuthority | Yes |
| editorialGateCodeName | Yes when applicable |
| artifactId | Yes when artifact-bound |
| artifactVersion | Yes when artifact-bound |
| decision | Yes for author decisions |
| occurredAt | Yes |
| sessionEvidence | Yes |
| correlationId | Yes |
| causationId | Yes where applicable |
| idempotencyKey | Yes |
| proofContractId | Yes for consequential action |

## 15. Mandatory Design Questions

Every author-facing lifecycle state, transition, author task, document release, and author-facing capability must answer:

1. Who is acting?
2. Against what exact resource?
3. What AX class applies?
4. What Path B authority level is required?
5. What editorial gate applies, if any?
6. What exact artifact/version is involved?
7. What confirmation or consent is required?
8. What event is emitted?
9. What lifecycle, commercial, or contractual effect can occur?
10. What Transition Contract controls?
11. What Proof Contract controls?
12. What security tier controls?
13. What cadence or escalation applies?
14. What causes refusal?
15. What is reversible?
16. What evidence survives replay and recovery?

## 16. Worked Example: Developmental Author Review

Concept: author receives a Developmental Editing review package and chooses whether to approve it, request changes, or ask a question.

| Item | Classification |
|---|---|
| Author Experience class | AX2 Creative / Editorial Decision |
| Path B authority to record evidence | A2 Internal Write |
| Path B authority if system sends external package | A4 External Execute |
| Editorial gate | A2 Developmental Completion |
| Artifact binding | Required: exact Developmental artifact/package/version/checksum |
| Version binding | Required |
| Lifecycle effect | TRANSITION_ELIGIBILITY_EFFECT; movement to Line Editing requires Transition Contract pass |
| Contractual effect | None unless bundled with separate contractual consent, which is prohibited by default |
| Proof required | Identity, title/resource relationship, artifact/version, event log, no cross-author access, no stale/superseded artifact |
| Refusal examples | Wrong author, stale package, superseded artifact, missing artifact checksum, inactive gate, ambiguous profile |

This example must never be rendered as `A2 approval` without namespace. The correct phrasing is: `AX2 - Creative / Editorial Decision concerning Editorial Gate A2 - Developmental Completion, with Path B authority evaluated separately.`

## 17. Compatibility Review

| Compatibility target | Result | Basis |
|---|---|---|
| Path B A0-A5 | PASS | AX0-AX5 is separate and does not redefine Path B A0-A5 |
| Editorial A1-A9 gates | PASS | Editorial gates retain full canonical code/name usage |
| Proof Contract Standard v1.0 | PASS | Requires proof, negative proof, manual intervention accounting, and no false maturity promotion |
| CMM Extension v2.1 | PASS | Preserves maturity/security/authority separation |
| Transition Contract model | PASS | Author actions produce evidence; Transition Contract controls movement |
| Canonical lifecycle | PASS | No alternate lifecycle state authority created |
| Editorial Cadence Doctrine | PASS_WITH_BOUNDARY | Cadence/escalation referenced as a separate control, not redefined here |
| Author OTP / CIAM architecture | PASS_WITH_BOUNDARY | Authentication is explicitly separated from authorization and consent |
| Operating Center authority | PASS | Operator surfaces may display status but do not manufacture authority |
| Artifact authority | PASS | Exact artifact/version binding required |
| Security tiers | PASS_WITH_TIER_2_OPERATIONAL_HOLD | Tier 2 prohibited until separate security proof passes; authority-contract ratification does not prove Tier 2 security |
| Client-title automation freeze | PASS | No freeze lift, runtime activation, or implementation authority created |

## 18. Material Conflicts Remaining

MATERIAL_CONFLICTS_REMAINING: NONE IDENTIFIED AFTER NARROW CLARIFICATIONS

Known hold: this document is ratified governance authority only. It must not be treated as implementation authority, schema authority, runtime authority, V1 Author Platform build authority, Tier 1 security proof, Tier 2 security proof, portal action runtime proof, or legal advice.

## 19. Ratification Disposition

FOUNDER_DISPOSITION: RATIFY_WITH_NARROW_CLARIFICATIONS

The narrow clarifications are limited to AX namespace reservation, AX5 legal-sufficiency boundary, Tier 2 hard hold, qualified identifier rule, and action-event immutability. The material namespace conflict has been resolved by AX0-AX5.

## 20. Implementation Boundary

V1_IMPLEMENTATION_AUTHORIZED = NO

TIER_1_SECURITY_PROOF_STATUS = UNCHANGED / NOT PROVEN

TIER_2_SECURITY_PROOF_STATUS = NOT PROVEN / HOLD

PORTAL_ACTION_RUNTIME_PROOF = NOT PROVEN

CLIENT_TITLE_AUTOMATION_FREEZE = ACTIVE

PUBLISHING_DISCRETIONARY_ARCHITECTURE_FREEZE = ACTIVE

No V1 Author Platform implementation should begin under this document until Jackie separately grants build authority.
