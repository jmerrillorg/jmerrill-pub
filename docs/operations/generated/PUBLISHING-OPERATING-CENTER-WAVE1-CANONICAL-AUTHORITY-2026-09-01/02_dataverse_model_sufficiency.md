# Dataverse Model Sufficiency

Last Verified: 2026-09-01T08:58:42.419Z

EXISTING_MODEL_SUFFICIENT = YES
SCHEMA_CHANGE_REQUIRED = NO

Existing jm1pub_title fields used:

| FIELD | TYPE | VALID_FOR_UPDATE |
| --- | --- | --- |
| jm1_canonicalstatus | String | true |
| jm1_canonicaltitlereference | String | true |
| jm1_canonicalauthorcontactreference | String | true |
| jm1_sourceauthority | String | true |


Forbidden lifecycle, Waiting On, timer, commercial, editorial, and artifact fields were excluded from every PATCH payload.
