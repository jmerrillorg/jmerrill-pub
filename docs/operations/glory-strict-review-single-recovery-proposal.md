# Glory single additional recovery proposal

INACTIVE_REVIEW_CANDIDATE: no approval record, timer, enablement or model call.
The registered one-off route is default DENY. Ordinary five-attempt budget unchanged.

Same title f1908dc9-5775-f111-ab0f-6045bdd69435 and execution binding
db8d5c1739326938f7ac0c8c06396ecae5190cefbddb84f9b4cb13be13374150.
Strict producer release772ccf45e05d3148c47161c58c2dab8ed3e536a8.
Held ETag "0x8DF260AFB989AC7", attempt5, REVIEW_CATEGORY_NOTES_INVALID.
Source/canon/rejected-candidate hashes are pinned in the candidate module.

Before CAS require independently verified attributable unexpired approval,
full preimage hash, ETag, producer release, fresh source/canon/authorship/
scope, input-token count and current provider tariff/budget. These mandatory
owner-reader bindings are not yet production wired. A caller cannot certify
its own approval. The recovery artifact will have its own reviewed SHA.

Proposed bounds: one additional attempt6, not reset; zero retries/fallback;
240000ms provider timeout;8192 output tokens; <=125000 verified input tokens.
Azure October9 metadata: jm1-editorial-devline-primary,claude-sonnet-5/version2,
GlobalStandard,Succeeded. Prior request114646input/5694output. At published
$2/$10 per million tokens,114646input/8192output estimates $0.311212;
125000input/8192output estimates $0.33192 before tax/negotiated terms.
Proposed ceiling $1 incremental model spend before tax. This is an estimate,
not verified tenant billing or spend authority.
Source: https://platform.claude.com/docs/en/about-claude/pricing (October9
readback, Foundry Marketplace CCU pricing).

CAS preserves full attempt5, ETag, approval hash and bounds inside attempt6.
Consume the existing review owner adapter/validator/create-only custody.
Completion requires exact title/parent/report hash/reference and no stage
effect. Timeout/invalid/ambiguous result stays HELD; no blind retry. Lost
result CAS preserves the claim. Reconcile exact receipts without another
model invocation. Ordinary worker cannot reclaim additionalRecovery records.

Activation requires reviewed owner approval/current-authority/token-budget
readers and one-off internal dispatch. Broad workers stay OFF. Rollback:
disable one-off eligibility while preserving claims/receipts/history; never
restore attempt5 after an uncertain call. Source tests are not live proof.

Narrow proposed Jackie decision: authorize exactly one additional internal
Glory assessment, <=$1 before tax, zero retries, verified input<=125000,
output<=8192,240-second provider limit, unchanged authority and reviewed
owner bindings. Valid output enables only an internal review preview and
attributable publisher decision wait. Invalid output stays held. No editing,
author approval, stage, mail, payment, identifiers, distribution/publication
authority. No other title decision is bundled. No new assessment occurred.

## Implemented readers and dispatch

gloryReviewRecoveryReaders reads ETag-bound private records, not invocation
approval flags. Protected configuration must pin both approval and tariff raw
SHA256. Approval links a separately retained, hash-verified founder decision,
the exact execution/preimage/ETag, approved recovery release, strict producer
dependency, limits and <=1USD. Both records must match the canonical founder
Contact, timestamp and scope. Decision evidence must link the original human
instruction; a coordinator message, PR approval or deployment approval does
not constitute the additional-attempt decision. No record writer is provided.

Existing canonical request/scope/Dataverse/Graph/canon readers and the existing
review adapter verify authorship, current source and retained bytes, intake
receipt and prompt. Native ARM read verifies exact Foundry deployment/model/
version/SKU; count_tokens verifies the exact strict-tool request hash without
generating an assessment. Count is an estimate: apply5% input headroom, require
<=125000 ceiling, fresh<=5minutes count, fresh current tariff<=24hours,
no unsupported cache or additional charges, and estimated cost<=approved1USD.
Actual successful usage outside bounds is privately quarantined and HELD,
not accepted. A provider quote cannot guarantee absolute billing against an
unexpected provider-side price/count change; retain actual usage and audit it.

POST /api/publishing/commissioning/glory-review-recovery accepts only
{"mode":"PREFLIGHT"} or {"mode":"EXECUTE"}. Function-key authentication
AND the existing diagnostic-runner key are required. Both modes are default
DENY; no other title, prompt, approval, price, source or execution is caller
selectable. PREFLIGHT has no claim/write/inference; it may transmit the
already-authorized source prompt to the documented count-only endpoint.
EXECUTE rechecks independent authority/approval/tariff/request before its
one provider invocation. No scheduler or competing business runtime exists.

Required protected configuration after explicit approval only:
JM1_GLORY_RECOVERY_APPROVAL_ID, JM1_GLORY_RECOVERY_APPROVAL_SHA256,
JM1_GLORY_RECOVERY_TARIFF_SHA256, JM1_GLORY_RECOVERY_PREFLIGHT_ENABLED.
Approval/decision/tariff records reside in existing private stage-runtime
storage under commissioning-recovery-approvals/decisions/tariffs. Approval
must expire within24hours and be one-use via exact attempt5/preimage CAS.
All referenced decision bytes must match the approval's decision evidence
hash. Tariff must describe the proven Sonnet5/version2/GlobalStandard route,
USD micro-dollar-per-token rates, source reference, verification and expiry.

## Protected rollout and rollback

1. Review current PR950 diff/full CI and concurrent Function releases.
2. Merge/release exact reviewed artifact through canonical protected workflow
   with both new enablement flags absent/false. No approval/tariff is created.
3. Verify exact SHA/health, disabled route denial, unchanged held attempt5,
   source/canon/candidate ETags, and both broad workersOFF. Preserve LKG.
4. Obtain explicit one-attempt decision; existing owner retains decision,
   approval and current tariff, then protected configuration pins their hashes.
5. Verify current count/price/source preflight. EXECUTE requires existing
   ordinary commissioning-review timerOFF as well as broad stage/waitOFF.
   Enable only the bounded one-off dispatch, invoke once, then disable it.
6. Independently read exact attempt6, cost/receipt/document/quarantine custody
   and replay denial. Valid receipt becomes publisher-review work, not approval.

Rollback/ambiguous response: first disable one-off preflight/dispatch and keep
ordinary commissioning reviewOFF. Inspect exact claim/receipt state; never
reset/release the claim or initiate another model request from chat. Older
strict-producer LKG lacks the additionalRecovery ordinary-worker guard, so
do NOT restore that package with the ordinary review timerON after an attempt6
claim. Preserve every claim/result/preimage and reconcile forward. Broad
stage/wait workers remainOFF. No title/business/history rollback occurs.

No new permission is requested merely from a simulated denial. If native
ARM read is denied, the exact missing boundary is existing Function managed
identity Microsoft.CognitiveServices/accounts/deployments/read on the one
jm1-editorial-devline-primary deployment under ais-jm1-foundry, rg-jm1-ai;
return its actual denial for separate scoped review, not Contributor/key fallback.
Likewise count-only access uses the existing Foundry workload identity;
permission failures stop before a claim. No platform grant is changed here.
