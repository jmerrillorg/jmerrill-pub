# Tests

Last Verified: 2026-08-22T08:19:57.929Z

Run:

```text
node --test scripts/jmp_portfolio_automation_controller.test.mjs
```

Result: 13 / 13 PASS.

The test suite covers eligible queueing, human gates, missing agreements after pricing lock, Joined-the-Family consequence, known action with unproven runtime becoming System Attention, idempotent queue identity, retry, provider backpressure, stale/unmapped detection, portfolio reevaluation after one-title repair, priority ordering, and portfolio summary counts.
