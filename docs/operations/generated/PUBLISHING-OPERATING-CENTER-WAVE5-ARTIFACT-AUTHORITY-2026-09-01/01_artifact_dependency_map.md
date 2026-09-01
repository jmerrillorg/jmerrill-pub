# Artifact Dependency Map

Last verified: 2026-09-01T17:46:18.227Z

| Source system | Source table/field | Artifact influence | Authority status |
|---|---|---|---|
| Dataverse | jm1pub_publishingasset relationship | Title/work binding | Authoritative when immutable relationship is surfaced |
| Dataverse | jm1pub_editorialartifact | Editorial artifact identity, class, version, status | Authoritative when title/work/stage/current/checksum are surfaced |
| SharePoint / OneDrive | Drive item id | Durable file identity | Supporting/authoritative only when bound to canonical title/work |
| Publisher Operating Center | evidenceLinks | Candidate artifact display | Not sufficient alone for current authority |
| Lifecycle registry | proven governed stage/substage | Stage compatibility | Authoritative for compatibility checks |
| Author approval gate | artifact/version decision binding | Approval status | Authoritative only when exact artifact/version is bound |

408-row recomputation completed. Manual intervention count: 0.
