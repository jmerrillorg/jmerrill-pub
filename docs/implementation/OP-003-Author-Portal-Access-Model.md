# OP-003 - Author Portal Access Model

**Status:** Implementation safety fix complete; Dataverse-backed author-specific persistence pending field confirmation
**Date:** 2026-07-01
**Scope:** Author Portal access control

---

## Current Access Model

Before this correction, `/author/portal` used the same shared access-code gate as the author setup forms. That model is acceptable only for an MVP/private preview because it does not identify a specific author, Contact, title, or project.

The portal now has a separate access scope from the author setup forms:

- Author setup forms keep the existing `forms` access scope.
- `/author/portal` uses the stricter `portal` access scope.
- The portal scope supports an admin-only master code and author/project-specific access records.
- The portal no longer stores the submitted access code in browser session storage.

## Required Target Model

Each author/project portal credential must be tied to one governed portal record. The minimum target record must identify:

- Contact
- title/project
- portal access status
- hashed access token or code
- expiration/rotation capability
- last accessed timestamp

The portal must render only data authorized for that Contact and title/project. Until that Dataverse read contract exists, OP-003 remains generic/read-only and must not expose private project data.

## Master/Admin Access

Jackie/admin review must use a master access code stored only in secure configuration:

- `AUTHOR_PORTAL_MASTER_ACCESS_CODE`

Production portal access requires `AUTHOR_PORTAL_MASTER_ACCESS_CODE`. The existing `AUTHOR_ONBOARDING_ACCESS_CODE` remains scoped to author setup forms and must not be treated as a portal credential after this correction. The master code is admin-only behavior and must not be sent to authors.

## Author-Specific Access Records

The implemented server helper supports author/project access records with this safe shape:

```json
[
  {
    "status": "active",
    "expiresOn": "2026-12-31T23:59:59Z",
    "accessCodeHash": "sha256-hash",
    "contactId": "contact-guid",
    "titleId": "title-guid",
    "projectId": "project-guid",
    "titleName": "Title"
  }
]
```

Production should source these records from Dataverse. A temporary `AUTHOR_PORTAL_ACCESS_RECORDS_JSON` setting exists only as a bridge/test harness and must not become the long-term system of record.

Plain `accessCode` values are accepted only outside production for local validation. Production records must use `accessCodeHash`.

## Dataverse Field Inspection

Read-only metadata inspection was attempted from the website service-principal path. The token request succeeded, but metadata reads returned HTTP `403` for:

- `contact`
- `opportunity`
- `jm1pub_title`
- `jm1pub_authoragreement`
- `jm1_publishingintake`
- `jm1pub_submission`

Result: existing portal/access fields could not be confirmed from live metadata in this pass.

## Proposed Minimal Dataverse Fields

Do not create duplicate concepts if equivalent fields already exist. Once metadata access is available, inspect and reuse before adding fields.

Recommended table location:

- Preferred: title/project portal access table if one already exists.
- Acceptable minimal path: `jm1pub_title` or the active project/title record used by OP-002 portal activation.

Minimum fields:

| Purpose | Proposed logical name | Type | Notes |
|---|---|---|---|
| Portal Access Token Hash | `jm1_portalaccesstokenhash` | Text | Stores hash only, not plain code |
| Portal Access Expires On | `jm1_portalaccessexpireson` | DateTime | Enables rotation/expiration |
| Portal Access Status | `jm1_portalaccessstatus` | Choice | Active, Disabled, Expired, Rotated |
| Portal Last Accessed On | `jm1_portallastaccessedon` | DateTime | Updated only after authorized access logging is approved |
| Portal Contact | existing Contact lookup | Lookup | Reuse existing Contact relationship when present |
| Portal Title/Project | existing title/project lookup | Lookup | Reuse OP-002 project/title relationship when present |

Admin/master override does not require a Dataverse field. It remains an app secret.

## Security Boundaries

The portal must not display the following unless the request is authorized for the specific author/project or the admin master code:

- contracts
- banking information
- payment details
- royalty statements
- private files
- project-specific private documents

OP-003 currently remains safe because the deployed portal displays generic/read-only MVP data only.

## Validation Requirements

Before author-specific portal data goes live:

- invalid code returns HTTP 401
- wrong author code cannot access another author/project
- valid author code returns only its matching Contact/title/project context
- master code works for admin/testing
- no access code, token, hash, or master code appears in logs or source
- no contracts, banking, royalties, payment details, or private files render without authorization
- type-check, lint, build, `git diff --check`, and secret scan pass

## Next Action

Resolve the Dataverse metadata permission blocker, inspect the existing OP-002/portal field map, then either reuse existing fields or create the minimal missing fields through the governed Dataverse schema process.
