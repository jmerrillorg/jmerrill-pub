# Negative Proofs

## Wrong-audience token rejection

A Graph token used against Dataverse `WhoAmI()` returned:

- status = 401
- result = PASS

This proves Dataverse did not accept a wrong-audience Microsoft Graph token.

## Graph least-privilege checks

The managed identity Graph token contained:

- roles = Sites.Selected

Broad Graph roles were absent.

Tenant-wide site search probe:

- endpoint = /sites?search=jmerrill
- status = 403
- result = PASS

Mail access probe:

- endpoint = /users/publishing@jmerrill.one/messages?$top=1
- status = 403
- result = PASS

## Negative proof classification

- TENANT_WIDE_SITES_AUTHORITY = ABSENT
- MAIL_AUTHORITY = ABSENT
- GRAPH_BROAD_ROLES = ABSENT
- NEGATIVE_PROOFS = PASS
