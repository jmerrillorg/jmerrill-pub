# Author Communication Preflight

Last Verified: 2026-08-29T12:04:54Z

Implemented preflight checks:

1. Truth: author-facing statement must match current governed facts.
2. Custody: JMP-held or recoverable evidence must be checked before requesting author action.
3. Necessity: author request must be necessary.
4. Recency: recent related author communication must be considered.
5. Contradiction: do not send language contradicted by newer evidence.
6. Supersession: pending stale messages may be displaced by newer communication purpose.
7. Consolidation: closely related lifecycle messages should be combined where useful.
8. Cadence: non-emergency author-facing releases observe the 24-hour minimum rhythm.
9. Human-first: internal state must be translated into clear publishing language.
10. Action: the email should tell the author what, if anything, to do next.

Implemented in:

- `evaluateCommunicationPreflight`
- `evaluateTruthBeforeRequest`
- `evaluateCadence`
- `resolveSupersession`
- `validatePackageRecommendation`

Evidence Source: `azure-functions/diagnostic-ai-runner/test/authorCommunicationPreflight.test.js`.
