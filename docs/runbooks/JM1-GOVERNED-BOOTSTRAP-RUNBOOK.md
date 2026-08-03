# JM1 Governed Bootstrap Runbook

## Standard Command

```bash
npm run jm1-bootstrap -- --initiative "The Intentional Leader" --mode "author-communication"
```

Supported modes:

- `read-only`
- `development`
- `governance`
- `production-dry-run`
- `production-mutation`
- `author-communication`
- `deployment`

## Required Opening Statement

After a successful bootstrap, a Cody thread states:

```text
JM1 BOOTSTRAP COMPLETE
Enterprise canon: LOADED
Repository canon: LOADED
Runtime canon: VERIFIED
Initiative context: LOADED
Current main SHA: <sha>
Current production release: <sha>
Execution mode: <mode>
Allowed actions: <list>
Held actions: <list>
Conflicts: 0 or exact list
```

## Secret Handling

The bootstrap may report whether configuration exists. It must not print tokens, keys, connection strings, cookies, raw account links, or mailbox secrets.

## Failure Behavior

`BOOTSTRAP FAIL` stops side effects. `BOOTSTRAP PASS WITH HOLDS` allows local preparation and dry-runs only.

## Handoff Records

Long-running initiatives must maintain:

- `docs/operations/active/<initiative-slug>/CURRENT-STATE.json`
- `docs/operations/active/<initiative-slug>/CURRENT-STATE.md`

The handoff record, not conversation compaction, is the controlled continuity mechanism.
