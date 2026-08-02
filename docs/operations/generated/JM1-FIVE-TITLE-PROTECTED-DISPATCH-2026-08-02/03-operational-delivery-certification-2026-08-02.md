# Operational Delivery Certification Addendum

Generated: 2026-08-02T04:35:00-04:00

## Governance Rule

Technical dispatch is not equivalent to operational delivery.

The governed release state sequence is now:

READY_FOR_AUTHOR_RELEASE
-> TECHNICALLY_RELEASED
-> OPERATIONALLY_CERTIFIED
-> AWAITING_AUTHOR_RESPONSE

TECHNICALLY_RELEASED means ACS accepted the send request and the gate/send records exist. OPERATIONALLY_CERTIFIED additionally requires branded HTML, required attachments, attachment checksums, archive confirmation, Author Operating Center package visibility, response controls, and a single valid gate.

No title may be treated as Awaiting Author Response until operational delivery certification passes.

## Production Release Context

- PR #381: merged
- PR #381 merge SHA: 2292bb2c7490a3eac1b879a4291fbaf61eb1c147
- Production release observed during certification: c1822b9be425326959156909bdb5c3a11b4b8bfe
- `/api/health`: ready
- Payment gate: disabled

## Certification Criteria

| Criterion | Required result |
| --- | --- |
| Branded HTML | PASS |
| Required attachments | PASS |
| Attachment checksums | PASS |
| Archive | PASS |
| Author portal access | PASS |
| Package visible | PASS |
| Response controls visible | PASS |
| Single active gate | PASS |

## The Intentional Leader

| Check | Result | Evidence |
| --- | --- | --- |
| Technical dispatch | PASS | Workflow run 30739000581; provider accepted-without-provider-message-id; execution logs 74ae9791-488e-f111-8077-6045bdd69678, 76ae9791-488e-f111-8077-6045bdd69678, 77ae9791-488e-f111-8077-6045bdd69678 |
| Branded HTML | PASS | Archive message body content type was html |
| Required attachments | PASS | Archive message reported attachments present |
| Attachment checksums | PASS | Manifest checksum 13bd981b253a60817f20c9135bd9dc60b7c4a9a2e2d518c8980743a011893f90; proof checksum dfc25985d495a425935751ab33ab108c372c9373141940fb44ddffc9cf12aca3 |
| Archive | PASS | publishing@jmerrill.one archive copy received 2026-08-02T08:03:10Z |
| Author portal access | FAIL | Authenticated author view loaded, but The Intentional Leader package was not visible |
| Package visible | FAIL | Author view displayed The Long Watch only; The Intentional Leader text was absent |
| Response controls visible | FAIL | Approve as presented, approve with corrections, and questions/clarification controls were absent |
| Single active gate | PASS | Gate inventory found one active Interior Layout gate: 5141f7db-0a8e-f111-8077-00224820105b |

Operational Delivery:
FAILED

Correct classification:
TECHNICALLY_RELEASED / OPERATIONAL_CERTIFICATION_FAILED

The title must not remain in a business-complete Awaiting Author Response state until Author Operating Center package visibility and response controls pass.

## Before You Were Born

| Check | Result | Evidence |
| --- | --- | --- |
| Technical dispatch | PASS | Corrected dispatch run 30738351416; delivery log c2518cd6-458e-f111-8077-00224820105b |
| Branded HTML | PASS | Archive message body content type was html |
| Required attachments | PASS | Archive message reported attachments present |
| Attachment checksums | PASS | Corrected package evidence preserved in PR #388 baseline |
| Archive | PASS | publishing@jmerrill.one archive copy received 2026-08-02T07:43:46Z |
| Author portal access | FAIL | Author reported no Author Operating Center access before the corrected send; no later author-access certification exists |
| Package visible | FAIL | No authenticated author portal proof shows the package visible to the canonical author |
| Response controls visible | FAIL | No authenticated author portal proof shows response controls visible to the canonical author |
| Single active gate | REQUIRES LIVE READBACK | Dataverse readback was blocked by Azure Key Vault DNS resolution failure during this certification pass |

Operational Delivery:
FAILED

Correct classification:
TECHNICALLY_RELEASED / OPERATIONAL_CERTIFICATION_FAILED

The July 30 cadence failure remains preserved as failed historical evidence and is not reinterpreted as delivery.

## The Long Watch

| Check | Result | Evidence |
| --- | --- | --- |
| Technical dispatch | PARTIAL | Archive evidence exists for a Developmental Editing message |
| Branded HTML | PASS | Archive message body content type was html |
| Required attachments | FAIL | Archive message reported no attachments |
| Attachment checksums | FAIL | No delivered attachment set exists to checksum-verify |
| Archive | PASS | publishing@jmerrill.one archive copy observed at 2026-08-02T05:07:49Z |
| Author portal access | FAIL | No authenticated author portal proof shows a usable package response path for this title |
| Package visible | FAIL | The portal showed The Long Watch as Published / Legacy, not as a Developmental review package awaiting response |
| Response controls visible | FAIL | Response controls were absent |
| Single active gate | REQUIRES LIVE READBACK | Dataverse readback was blocked by Azure Key Vault DNS resolution failure during this certification pass |

Operational Delivery:
FAILED

Correct classification:
DELIVERY_FAILED

The existing message must be superseded before a corrected package is sent through the hardened path.

## Live Readback Limitation

The Dataverse gate/stage readback attempted during this certification pass could not safely retrieve credentials because Azure Key Vault DNS resolution failed for `kv-jm1-prod.vault.azure.net`.

No secret values were printed or retained. Live Dataverse records therefore require a follow-up readback once Azure DNS/Key Vault access is available before any corrected resend or gate-status mutation.

## Permanent Guard

The dispatch service has been changed so provider acceptance records only TECHNICALLY_RELEASED. It no longer moves the gate to AWAITING_AUTHOR_RESPONSE or starts the seven-calendar-day response clock at ACS acceptance.

The worker now:

- blocks duplicate active gates before send;
- blocks invalid intake references before send;
- records `PUBLISHING_DISPATCH_TECHNICALLY_RELEASED`;
- records `PUBLISHING_DISPATCH_OPERATIONAL_CERTIFICATION_PENDING`;
- requires `PUBLISHING_DISPATCH_OPERATIONALLY_CERTIFIED` before idempotent completion;
- returns `technical-release-recorded` to orchestration instead of `notification-sent` when only technical release has occurred.

## Final Classification

THE INTENTIONAL LEADER
Operational Delivery:
FAILED

Before You Were Born
Operational Delivery:
FAILED

The Long Watch
Operational Delivery:
FAILED

Titles awaiting author response:
Only operationally certified titles are permitted. The three reviewed titles are not operationally certified by current evidence.

Pipeline maturity:
Operational Delivery Certification implemented in code and evidence; production activation is pending PR #388 review, merge, and deployment.

Secret values retained:
0
