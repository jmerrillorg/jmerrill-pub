# Protected Deployment Plan

Status: FUTURE DELIVERY DESIGN ONLY

1. Development solution: implement schema and services only after explicit authority.
2. Managed solution export: export versioned solution package; no unmanaged production edits.
3. Staging deployment: import to staging only.
4. Metadata readback: verify fields, choices, relationships, keys, roles and no destructive cascades.
5. Runtime deployment: deploy protected runtime to non-production first.
6. Protected dry-run: simulate transitions with no mutation.
7. Internal-title rehearsal: run internal titles first, never client-title automation.
8. Explicit production authorization: named approval, exact version, exact scope.
9. Production mutation: execute only approved package/version.
10. Independent readback: verify Dataverse, execution-log and projection state.
11. Idempotency replay: rerun approved request and require no-op matches.
12. Rollback: use managed solution rollback and compensating execution-log events.

## Promotion Rules

- Explicit promotion authority only.
- No auto-swap.
- No local production credentials.
- No manual production table creation.
- No direct ad hoc Dataverse writes.
