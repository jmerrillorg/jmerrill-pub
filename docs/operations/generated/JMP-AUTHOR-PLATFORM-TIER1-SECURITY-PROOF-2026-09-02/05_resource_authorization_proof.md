# Resource Authorization Proof

Last verified: 2026-09-02T21:45:33Z

## Evidence Sources

- `app/api/author/context/route.ts`
- `app/api/author/artifacts/[artifactId]/download/route.ts`
- `lib/server/author-portal-context.ts`
- `scripts/author_active_stage_artifact_visibility.test.mjs`

## Proven Behavior

- Author context requires either a signed author portal cookie or durable author session.
- Publisher durable session receives `403 author_session_required`.
- Project selection only selects from the resolved project list.
- Artifact download must find the artifact in the resolved author context before Graph download.
- Artifact download also verifies publishing asset ownership, delivered status, author-facing visibility, current-approved status, and not-superseded status.
- Missing or unauthorized artifacts return `404` after session authorization and `401` without session.

## Production Probe

`GET /api/author/artifacts/00000000-0000-0000-0000-000000000000/download` without author access returned `401`.
