# Bootstrap Validation

## Mandatory Startup

Every governed execution must begin with:

```bash
npm run jm1-bootstrap -- --initiative "<initiative>" --mode "<mode>"
```

## Commissioned Modes

- `read-only`
- `development`
- `governance`
- `production-dry-run`
- `production-mutation`
- `author-communication`
- `deployment`

Unknown modes fail closed with `INVALID_BOOTSTRAP_MODE`.

## Workflow Enforcement

- Publishing App Service deployment runs Bootstrap before build/deploy guards.
- Five-title protected recovery dispatch runs Bootstrap before invoking production dispatch.
- Bootstrap guard, canon guard, and handoff guard are part of commissioning validation.

## Pilot

The Intentional Leader author-communication pilot:

```text
BOOTSTRAP PASS WITH HOLDS
CONTROLLING_MAIN_SHA: 76ede371f22c59152f491848707df85ff6fced6f
AUTHOR_APPROVAL: APPROVED
ADDITIONAL_AUTHOR_COMMUNICATION: NOT AUTHORIZED
DUPLICATE_GATE: PROHIBITED
RETROACTIVE_RESPONSE_CLOCK: PROHIBITED
```

The hold is intentional because no duplicate author communication is authorized after approval.
