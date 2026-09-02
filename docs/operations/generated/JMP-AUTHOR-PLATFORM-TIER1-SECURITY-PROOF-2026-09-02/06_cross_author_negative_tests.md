# Cross-Author Negative Tests

Last verified: 2026-09-02T21:45:33Z

## Local Proof

The regression suite proves the following negative conditions:

- Wrong title reply creates no state change.
- Wrong package reply creates no state change.
- Wrong artifact checksum holds.
- Multiple candidate artifacts hold.
- Approval of an older artifact version cannot approve the current stage artifact.
- Download endpoint requires artifact to be visible in current author context.

## Source Proof

`app/api/author/artifacts/[artifactId]/download/route.ts` requires:

- artifact appears in `context.projects[].artifacts`;
- artifact publishing asset belongs to a resolved context project;
- artifact is delivered, author-facing, current-approved, and not superseded.

## Runtime Gap

No live two-author authenticated session test was executed. Classification: `PASS_WITH_NARROW_RUNTIME_GAP`.
