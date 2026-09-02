# Rollback and Boundary Proof

## Rollback Evidence

The prewrite snapshot establishes the two reversible production changes:

1. Author Profile `0359c9cc-aef8-5053-b902-6acbc3dff551` did not exist before provisioning.
2. Title `48e831f0-418b-f111-ab10-000d3a1a9efa` had `jm1_primaryauthor = null` before provisioning.

If rollback is separately authorized, the bounded rollback would be:

1. Remove or deactivate only Author Profile `0359c9cc-aef8-5053-b902-6acbc3dff551`.
2. Clear only `jm1_primaryauthor` on Title `48e831f0-418b-f111-ab10-000d3a1a9efa`.

No rollback was executed in this pass.

## Boundary Proof

| Negative proof | Result |
|---|---|
| second_author_profile_created | 0 |
| contact_created | 0 |
| title_created | 0 |
| real_author_modified | 0 |
| real_client_title_modified | 0 |
| lifecycle_stage_changed | 0 |
| agreement_changed | 0 |
| payment_changed | 0 |
| stripe_relationship_created | 0 |
| commercial_rights_created | 0 |
| contract_authority_created | 0 |
| provider_delivery_invoked | 0 |
| email_sent | 0 |
| cadence_proof_rerun | 0 |

## Remaining Freezes

| Control | State |
|---|---|
| `CLIENT_TITLE_AUTOMATION_FREEZE` | `ACTIVE` |
| `PUBLISHING_DISCRETIONARY_ARCHITECTURE_FREEZE` | `ACTIVE WITH NARROW NAMED PROOF EXCEPTION` |
| `CLIENT_TITLE_EXECUTION_AUTHORIZED` | `NO` |
