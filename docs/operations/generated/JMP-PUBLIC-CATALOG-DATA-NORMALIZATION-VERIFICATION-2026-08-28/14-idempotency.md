# Idempotency

Last Verified: 2026-08-28T08:17:14.058Z
Attribution repairs are idempotent: matching Dataverse author fields are treated as NO_OP_MATCH and are not rewritten. Slug repair is projection-derived from stable title IDs and does not mutate title identity.
