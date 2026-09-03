# 08 - Author Relationship Lifecycle

## Canon

Author relationship lifecycle is distinct from prospect/commercial state and title/project state.

## Current Sources

- Author onboarding route/fallback.
- Author Workspace modules.
- Durable auth/portal context.
- Stripe workspace integration.
- Royalty setup/financial setup routes.
- Post-publication/royalty evidence packages.

## Gap

No inspected single source promotes relationship state from agreement/payment events into `JOINED_THE_FAMILY`, onboarding readiness, workspace readiness, royalty readiness, and post-publication stewardship.

## Proposed Relationship States

| State | Meaning |
|---|---|
| PROSPECT | Inquiry exists; no commercial activation |
| PACKAGE_ACCEPTED | Author selected/accepted package |
| AGREEMENT_PENDING | Agreement not executed |
| PAYMENT_PENDING | Initial payment not received |
| JOINED_THE_FAMILY | Agreement executed and required initial payment received |
| ONBOARDING_IN_PROGRESS | Onboarding tasks open |
| ACTIVE_AUTHOR | Relationship active for at least one title |
| POST_PUBLICATION | At least one released/published title |
| DORMANT | No active title work but relationship retained |
| TERMINATED | Relationship ended per agreement/policy |

Do not invent legal consequences for terminal states.
