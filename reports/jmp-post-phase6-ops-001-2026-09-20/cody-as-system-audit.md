# Cody-as-System Audit

## Current result

- Whole onboarding heartbeat: `RETIRED` / automation deleted.
- Whole replacement: `/author/onboarding` with synchronous Power Automate processing, idempotent Dataverse fallback, durable submission/execution records, exact tuple correlation, and Application Insights visibility.
- Inbound mail: `SYSTEM_DRIVEN` / commissioned and replay-proven.
- Remaining Publishing production condition dependent on Cody conversation polling: `1`.

## Remaining dependency

Automation `jmp-stripe-connect-reminder-cadence` is an active heartbeat that runs `npm run stripe-connect-reminder-cadence` and may execute governed reminder sends when an author becomes due. It is therefore a real production cadence dependency on a Cody task, even though the underlying processor enforces live Stripe readback, idempotency, holds, ACS sender canon, and sanitized Dataverse logging.

## Systemization handoff

Owner repository: `jmerrillorg/jmerrill-pub`

Target runtime: a native scheduled Publishing runtime using the existing reminder-cadence processor. The migration must reuse, not replace, the governed policy and communication stack.

Required closure proof:

1. Native scheduler invokes the existing processor under a non-human workload identity.
2. Live Stripe state, canonical Connect account correlation, support/review/completed holds, and semantic idempotency remain unchanged.
3. ACS sends only from `publishing@email.jmerrill.one`, with governed reply/archive behavior.
4. Dataverse execution logs remain sanitized and durable; secrets and Account Link URLs are never logged.
5. A no-op run, one naturally due controlled run, duplicate denial, failure visibility, and replay behavior pass in production.
6. Monitoring and ownership are visible outside a conversation task.
7. Only after production proof, retire the Cody heartbeat in a separately authorized action.

Until that proof, the heartbeat remains an operational continuity control and must not be disabled. Consequently `CODY_CONTINUOUS_PRODUCTION_POLLING = 1`, with a target of `0` after systemization.
