# JM1-INFRA-005 Production Rollback Runbook

Status: Active operational runbook
Version: 1.0
Date: 2026-07-27
Owner: JM1 Infrastructure / Publishing Operations

## Triggers

Start this runbook when any of the following occur after a production deployment:

- repeated 500 or 503 responses;
- repeated timeout or network failure;
- health gate failure after Azure reports deployment success;
- protected server route returns 500 or 503 instead of 401;
- production degradation remains unresolved after initial smoke checks.

Do not rollback solely because of one isolated transient failure unless customer impact continues or the failure repeats.

## Authority

For SEV-1 production availability, reversible rollback to the last known-good production artifact is pre-authorized. No force-push is authorized. No deletion of governed evidence is authorized.

Rollback does not authorize:

- Stripe charge, transfer, refund, or payout;
- Business Central production posting;
- author invitation or broad rollout;
- secret exposure;
- application redesign;
- platform migration.

## Evidence To Preserve First

Preserve when possible:

- current production SHA;
- last known-good SHA;
- GitHub Actions run URLs;
- SWA environment status;
- custom domain status;
- health probe results;
- deployment logs;
- timestamped operator notes;
- affected routes and first observed failure timestamp.

If service is actively unavailable, restore first and backfill evidence immediately after.

## Preferred Rollback Sequence

1. Confirm live impact with repeated probes for `/`, `/books`, `/authors`, `/author`, `/author/portal`, `/author/financial-setup`, and `/api/author/context`.
2. Identify the last known-good deployment SHA and workflow run.
3. Rerun the last known-good GitHub Actions production deployment when available.
4. If deployment rerun is unavailable, use the safest supported Azure Static Web Apps deployment rollback.
5. If artifact rollback cannot restore service, create a normal Git revert commit on a clean branch and merge through the governed path.
6. Do not rewrite history or force-push main.

## Verification

After rollback, validate:

| Surface | Required result |
| --- | --- |
| Homepage | 200 |
| Books/catalog | 200 |
| Authors | 200 |
| Author Portal page | 200 |
| Financial setup page | 200 |
| Unauthenticated author context | 401 |
| Forged former-fallback session | 401 |
| Static assets | 200 |

Run a governed stability window. The default is 10 minutes. For SEV-1 closeout, use at least 15 minutes when practical.

## Communication

Do not send public or author-facing outage communication unless the outage remains materially sustained or Jackie authorizes a notice. Record internal incident evidence as soon as service is stable.

## Completion Criteria

Rollback is complete when:

- production is serving the expected artifact;
- health probes pass for the required window;
- smoke tests pass;
- evidence is preserved;
- incident log is written;
- unauthorized payment, author, or Business Central actions are confirmed absent.
