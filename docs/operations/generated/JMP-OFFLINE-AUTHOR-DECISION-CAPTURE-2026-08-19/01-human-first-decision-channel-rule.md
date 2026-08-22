# Human-First Decision Channel Rule

**Author approval is mandatory. Electronic self-service approval is not.**

Valid decision channels (existing free-text field, values used consistently, not enum-enforced since `jm1pub_authordecisionsource` is text): `EMAIL`, `AUTHOR_OPERATING_CENTER`, `PHONE`, `IN_PERSON`, `TEAMS_VIDEO`, `SMS`, `OTHER_RECORDED`.

Decision and channel are separate dimensions:
- **Decision** — implemented via existing picklist `jm1pub_authordecision`: Approve (196650000) / Request Revision (196650001) / Request Clarification (196650002) / Hold (196650003) / Decline (196650004) / Override Approved (196650005).
- **Channel** — encoded in `jm1pub_authordecisionsource` alongside decision-maker and recorder identity.

Only an authenticated Publisher operator may record a decision from an offline channel. This is never exposed as a public/author-facing action. The Author Operating Center is not required to impersonate or recreate the verbal action — it may show a human-friendly audit entry if existing UX supports it, but no UX changes were made in this bounded pass.
