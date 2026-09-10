# Truth Before Author Request Rule

Last Verified: 2026-08-29T12:04:54Z

Rule:

Before any author-facing communication asks an author to send, resend, upload, provide, complete, tell, or otherwise supply information, the system must prove the requested item is not already present, not recoverable, not already answered, not already pending processing, and that the author is the correct person to resolve it.

Blocker:

`AUTHOR_REQUEST_NOT_PROVEN_NECESSARY`

Implemented in:

- `azure-functions/diagnostic-ai-runner/src/author/authorCommunicationPreflight.js`

Jackuline regression:

- Requested item: manuscript
- Custody evidence: manuscript artifact plus recovered source manuscript
- Result: request blocked
- Correct system action: recover/bind internally and communicate the current truthful state

Evidence Source: `evaluateTruthBeforeRequest` tests in `azure-functions/diagnostic-ai-runner/test/authorCommunicationPreflight.test.js`.
