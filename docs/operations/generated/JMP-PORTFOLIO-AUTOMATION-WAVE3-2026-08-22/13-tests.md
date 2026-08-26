# Tests

Last Verified: 2026-08-26T14:34:10.977Z

Commands:

```text
node --test scripts/jmp_portfolio_automation_controller.test.mjs
node --test scripts/jmp_portfolio_automation_wave2.test.mjs
node --test scripts/jmp_portfolio_automation_wave3.test.mjs
node scripts/jmp_portfolio_automation_wave3.mjs --execute
npm run type-check
npm run lint
```

Expected validation: controller tests PASS, Wave 2 tests PASS, Wave 3 tests PASS, live Wave 3 runner PASS, type-check PASS, lint PASS with the existing Next.js custom-font warning in `app/layout.tsx`.
