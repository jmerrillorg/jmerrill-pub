# Context Tampering Tests

Last verified: 2026-09-02T21:45:33Z

## Browser/Input Surfaces Reviewed

- `reference`
- `intakeReference`
- `opportunityId`
- `titleId`
- `publishingAssetId`
- `artifactId`

## Evidence

- `app/api/author/context/route.ts` accepts route overrides but resolves context from cookie or durable author session first.
- `lib/server/author-portal-context.ts` selects only from the resolved project list.
- `app/api/author/artifacts/[artifactId]/download/route.ts` rejects non-GUID artifact IDs with `404`.
- Artifact download is independently revalidated server-side after context selection.

## Production Probe

Invalid artifact download without a session returned `401`, not content.

## Assessment

Context tampering is source-proven for server-side artifact checks. A live authenticated test with another author's IDs remains a narrow V1 proof gap.
