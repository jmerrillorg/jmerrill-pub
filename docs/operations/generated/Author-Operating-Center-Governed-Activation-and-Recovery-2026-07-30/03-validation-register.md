# Validation Register

| Control | Evidence | Result |
| --- | --- | --- |
| External ID evaluated before email fallback | `scripts/author_external_id_claim_resolution.test.mjs` | IMPLEMENTED |
| Durable session carries External ID object binding | `lib/server/author-durable-auth.ts` and guard test | IMPLEMENTED |
| Consumed/revoked codes rejected | `scripts/author_activation_recovery_governance.test.mjs` | IMPLEMENTED |
| Recovery and activation purposes separated | `scripts/author_activation_recovery_governance.test.mjs` | IMPLEMENTED |
| Activation transaction omits raw code values | `scripts/author_activation_recovery_governance.test.mjs` | IMPLEMENTED |
| Microsoft-auth completion endpoint binds existing Contact before session issuance | `app/api/author/activation/complete/route.ts` and guard test | IMPLEMENTED |
| Universal/master fallback disabled in production | `scripts/author_activation_recovery_governance.test.mjs` | IMPLEMENTED |
| Identity conflict fails closed absent governed recovery | `scripts/author_activation_recovery_governance.test.mjs` | IMPLEMENTED |
| Author context resolves by External ID | `app/api/author/context/route.ts` and guard test | IMPLEMENTED |
| Artifact access resolves by External ID | `app/api/author/artifacts/[artifactId]/download/route.ts` and guard test | IMPLEMENTED |
| Marketing profile writes resolve by External ID | `app/api/author/marketing-profile/route.ts` and guard test | IMPLEMENTED |
| Author-facing copy avoids password/code capture | `app/author/_components/AuthorGate.tsx` | IMPLEMENTED |
| Carolyn relationship count precondition | Guarded expected six-title set in regression test | IMPLEMENTED |

## Carolyn Pilot Boundary

Carolyn Booker-Pierce / Carolyn Pierce-Jones activation remains governed by the canonical Contact and title relationship record. The guarded precondition is six validated title relationships:

- Abortion!
- Because the Lord Is My Shepherd
- Girl, You're Not Crazy. You're Dealing with a Narcissist
- Loving the Addict
- More Than a Village
- You're Still Not Crazy

No Carolyn pilot activation proof is complete until the author-controlled Microsoft sign-in step occurs without Cody seeing or retaining credentials.
