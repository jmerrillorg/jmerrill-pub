# OP-003 - Author Portal Access Model

**Status:** Implementation safety fix complete; Dataverse-backed author-specific persistence pending minimal schema approval
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

Each author portal credential must be tied to one governed author portal record. The author portal supports multiple title/project children. The minimum target record must identify:

- Contact
- Author Portal
- one or more authorized title/project records
- portal access status
- hashed access token or code
- expiration/rotation capability
- last accessed timestamp

The portal must render only data authorized for that Contact and the selected title/project child. Until that Dataverse read contract exists, OP-003 remains pre-contract, generic/read-only, and must not expose private project data.

## Portal Lifecycle

The corrected PROGRAM-002 lifecycle creates or updates the author portal after author acceptance and before contract generation:

- New author: create one portal.
- Returning author: add the accepted title to the existing portal.
- Never create a second portal for the same author relationship.

The pre-contract portal shows only:

- Author Onboarding
- Financial Setup
- Royalty Setup

After all three setup steps are complete, the system may generate the contract package and invoice/payment request, then display Sign Agreement and Submit Payment actions. The full active portal unlocks only after agreement is signed/active and payment is confirmed, or a publisher financial override is approved.

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
    "authorPortalId": "portal-guid",
    "titleIds": ["title-guid"],
    "projectIds": ["project-guid"],
    "titleName": "Title"
  }
]
```

Production should source these records from Dataverse. A temporary `AUTHOR_PORTAL_ACCESS_RECORDS_JSON` setting exists only as a bridge/test harness and must not become the long-term system of record.

Plain `accessCode` values are accepted only outside production for local validation. Production records must use `accessCodeHash`.

## Dataverse Field Inspection

Read-only metadata inspection was attempted from the website service-principal path. The token request succeeded, but metadata reads returned HTTP `403` for table metadata. This means the deployed website app identity still does not have metadata-read permission and should not be used as an admin inspection identity.

Read-only metadata inspection was then completed through the authenticated JM1-Core admin context. Existing reusable fields found:

| Table | Existing field | Use |
|---|---|---|
| `opportunity` | `jm1_m6authorportalstatus` | Reuse for portal status / active unlock state |
| `opportunity` | `parentcontactid` / `contactid` | Reuse for author Contact linkage where populated |
| `opportunity` | `jm1_linkedproject` | Reuse for project linkage where populated |
| `jm1pub_title` | `jm1_primaryauthor` / `jm1_author` | Reuse for title-to-author relationship where populated |
| `jm1pub_title` | `jm1_project` | Reuse for title-to-project relationship where populated |

Fields or tables not found:

- no JM1 author portal table
- no portal access token hash field
- no portal access expiration field
- no portal last-accessed field
- no portal credential/status table supporting one author portal with multiple title children

## Proposed Minimal Dataverse Fields

Do not create duplicate concepts if equivalent fields already exist. Once metadata access is available, inspect and reuse before adding fields.

Recommended table location:

- New minimal table: `jm1_authorportalaccess`
- Purpose: one author portal credential record per author portal/account, with child title/project authorization stored as safe references until a fuller portal data model is approved.

Minimum fields:

| Purpose | Proposed logical name | Type | Notes |
|---|---|---|---|
| Portal Access Name | `jm1_name` | Text | Human-readable internal name |
| Contact | `jm1_contactid` | Lookup -> Contact | Required author identity |
| Primary Opportunity / Project | `jm1_opportunityid` | Lookup -> Opportunity | Optional current accepted project |
| Authorized Title IDs | `jm1_authorizedtitleids` | Text / JSON text | Bridge until formal title-child portal model exists |
| Authorized Project IDs | `jm1_authorizedprojectids` | Text / JSON text | Bridge until formal project-child portal model exists |
| Portal Access Token Hash | `jm1_portalaccesstokenhash` | Text | Stores hash only, not plain code |
| Portal Access Expires On | `jm1_portalaccessexpireson` | DateTime | Enables rotation/expiration |
| Portal Access Status | `jm1_portalaccessstatus` | Choice | Active, Disabled, Expired, Rotated |
| Portal Last Accessed On | `jm1_portallastaccessedon` | DateTime | Updated only after authorized access logging is approved |

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

Use existing `opportunity.jm1_m6authorportalstatus` for portal status where possible. Create no schema blindly. If Jackie authorizes schema work, create only the minimum `jm1_authorportalaccess` fields above, then wire `/author/portal` to read authorized records from Dataverse.
