# Validation Report

Runtime:

- Node: v24.11.0.
- npm: 11.6.1.

Commands:

```bash
npm ci
npm run jm1-bootstrap-guard
npm run jm1-canon-consistency-guard
npm run jm1-initiative-handoff-guard
npm run author-communication-brand-guard
npm run program006-dispatch-guard
npm run type-check
npm run lint
npm run build
node --test azure-functions/acs-email-relay/test/validation.test.js
git diff --check
```

Result: PASS.

Additional validation:

- JSON validation: PASS.
- Manifest schema validation: PASS.
- Evidence-index validation: PASS.
- Changed-file secret scan: PASS.
- Full diff secret-pattern scan: PASS.
- Ephemeral `.bootstrap` outputs committed: 0.
- Runtime mutations: 0.
- Author communications: 0.

Known warnings:

- `npm ci`: existing dependency deprecation warnings for `inflight`, `@humanwhocodes/config-array`, `rimraf@3`, `glob`, `@humanwhocodes/object-schema`, `uuid`, and `eslint@8.57.1`.
- `npm ci`: existing audit summary of 9 vulnerabilities.
- `npm run lint`: existing `app/layout.tsx` custom-font warning.
- `npm run build`: same custom-font warning, edge-runtime static generation warning, and missing Dataverse catalog config for static generation.

New warnings: 0.
