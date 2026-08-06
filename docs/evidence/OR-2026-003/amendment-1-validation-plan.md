# OR-2026-003 Amendment 1 Validation Plan

Date: 2026-08-06

## Required Entitlement Scenarios

| Scenario | Expected Result |
| --- | --- |
| Starter - PF-01 + PF-03 | 5 paperback copies, 1 ebook entitlement |
| Starter - PF-01 + PF-05 | 5 paperback copies, 5 large-print copies |
| Starter - PF-05 + PF-03 | 5 large-print copies, 1 ebook entitlement |
| Professional - PF-01 + PF-02 + PF-04 | 10 paperback copies, 10 hardcover copies, 1 audio delivery |
| Professional - PF-01 + PF-05 + PF-03 | 10 paperback copies, 10 large-print copies, 1 ebook entitlement |
| Premier - PF-01 + PF-02 + PF-03 + PF-04 | 15 paperback copies, 15 hardcover copies, 1 ebook entitlement, 1 audio delivery |
| JM Signature - PF-01 + PF-05 + PF-03 | 15 paperback copies, 15 large-print copies, 1 ebook entitlement |
| PF-07 elected | Fail closed, no entitlement |
| PF-08 elected with approved digital scope | 1 digital entitlement |
| PF-08 not scope-approved | No entitlement; scope boundary returned |
| Unelected hardcover | 0 hardcover entitlement |
| Later-added PF-05 | Entitlement only after approved add-on/election |
| Duplicate PF election | One entitlement only |
| Empty PF election set | Fail closed |
| Idempotent regeneration | Identical result, no duplicates |

## Required Checks

- `npm ci`
- `npm run type-check`
- Full governed agreement/document-generation tests
- DOCX/PDF generated validation artifacts for principal entitlement scenarios
- Search validation for active fixed-format language
- Checksum validation

