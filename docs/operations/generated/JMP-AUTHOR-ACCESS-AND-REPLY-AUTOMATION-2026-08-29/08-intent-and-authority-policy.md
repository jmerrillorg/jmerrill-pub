# Intent and Authority Policy

Last Verified: 2026-08-29T07:51:18Z

## Intent Vocabulary

`ACCESS_HELP`, `LOGIN_HELP`, `ACCESS_CODE_REQUEST`, `INVITATION_PROBLEM`, `AUTHENTICATION_FAILURE`, `APPROVED`, `APPROVED_WITH_CORRECTIONS`, `CHANGES_REQUESTED`, `QUESTION`, `HOLD`, `STRIPE_CONNECT_HELP`, `DIRECT_DEPOSIT_HELP`, `FILE_RECEIVED`, `ACKNOWLEDGMENT_ONLY`, `GENERAL_SUPPORT`, `UNKNOWN`.

## Authority Rule

Intent recognition does not itself create lifecycle authority. One inbound author message may contain multiple non-exclusive intents, but only one authoritative lifecycle decision may control an active gate after identity, title, gate, artifact, thread, quoted-text, and semantic context checks pass.

Generic `please approve them` wording remains non-authoritative when context is ambiguous. A founder-ratified correction may override the original classification for an exact message/gate when the human business meaning is settled and the original result is preserved.

## Sean Regression

Text: `Thank you, I have received the files and please approve them. Also can May I have the Authors central access code?`

Original classification: `ACKNOWLEDGMENT_REVIEW_START_NOT_APPROVAL` / access support.

Founder-corrected classification: `DEVELOPMENTAL_EDITING_APPROVED_WITH_ACCESS_HELP`.

Message intents: `ACKNOWLEDGMENT`, `FILE_RECEIVED`, `APPROVAL`, `ACCESS_HELP`, `ACCESS_CODE_REQUEST`, `QUESTION`.

Authoritative lifecycle decision: `APPROVED`.

Support action: `ACCESS_HELP`.

Approval recorded: YES, once, against the current Developmental Editing gate.
