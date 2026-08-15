# Working Title Canon

Last verified: 2026-08-15T10:35:00-04:00

## Canon

When an author has not provided or approved a final title, the manuscript uses:

- working title: `Untitled`
- title status: `WORKING_TITLE`

This state is valid for:

- Stage 0
- Editorial Review
- Developmental Editing
- Line Editing
- Copyediting
- Proofreading
- ordinary author review within those stages

`Untitled` does not mean invalid title, rejected manuscript, incomplete intake, Jackie action, or author-review blocker.

## Runtime Evidence

Source: `lib/server/working-title-policy.ts`

The policy defines `WORKING_TITLE = 'Untitled'`, `TITLE_STATUS.WORKING_TITLE`, `displayTitle`, and `evaluateTitleReadiness`.

Source: `lib/server/publishing-dispatch-service.ts`

The dispatch service now validates `titleReadiness` independently from author-facing identity and artifact/package readiness.
