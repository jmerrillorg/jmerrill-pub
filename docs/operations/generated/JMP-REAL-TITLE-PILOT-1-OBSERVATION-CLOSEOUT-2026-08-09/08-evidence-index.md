# Evidence Index

Last verified: 2026-08-09T22:57:02Z

## Primary Evidence

| Evidence | Path / Source |
| --- | --- |
| PR #446 merge record | GitHub PR #446; merge SHA `94ae78390a1b628807477fcca15143785690d988` |
| PR #447 merge record | GitHub PR #447; merge SHA `993fb8c8f8297c981ed047683924049ab159edf7` |
| Live Action 001 evidence package | `docs/operations/generated/JMP-REAL-TITLE-PILOT-1-LIVE-ACTION-001-2026-08-09/` |
| Terminology remediation package | `docs/operations/generated/JMP-AUTHOR-FACING-PUBLISHING-TEAM-TERMINOLOGY-2026-08-09/` |
| Pilot launch card | `docs/operations/generated/JMP-MARKETING-CANON-RECONCILIATION-PILOT-445-READINESS-2026-08-09/PILOT-1-LAUNCH-CARD.md` |
| Pilot activation matrix | `docs/operations/generated/JMP-MARKETING-CANON-RECONCILIATION-PILOT-445-READINESS-2026-08-09/17-pilot-activation-matrix-update.md` |

## Validation Evidence

The canonical-main guard pass after both merges included:

- `npm ci`
- `npm run type-check`
- `npm run author-communication-brand-guard`
- `npm run real-title-pilot-1-preparation-guard`
- `npm run tranche4-author-marketing-experience-guard`
- `npm run tranche6-certification-controlled-thaw-guard`
- `npm run marketing-reconciliation-guard`
- `npm run marketing-spend-authorization-guard`
- `git diff --check`
- checksum validation for PR #446 evidence and PR #447 terminology evidence

