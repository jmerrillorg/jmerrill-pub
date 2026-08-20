# Schema Mapping

| Conceptual field | Existing Dataverse field | Notes |
|---|---|---|
| Decision | `jm1pub_authordecision` (picklist) | Approve/Request Revision/Request Clarification/Hold/Decline/Override Approved — exact match to required Decision dimension |
| Decision Channel | `jm1pub_authordecisionsource` (text, 100-char limit) | Structured tag: `verbal-phone:decision-by=<name>:recorded-by=<name>` |
| Decision Made By | encoded in `jm1pub_authordecisionsource` + `jm1pub_authorresponsesummary` | No dedicated person-lookup field exists on this entity; free-text is the reuse-compliant choice |
| Recorded By | same as above, plus Dataverse's own `modifiedby`/`createdby` system fields (service principal identity) | System fields record the technical actor; the narrative field records the true human recorder (Jackie) |
| Decision Occurred At | `jm1pub_authordecisionon` | Set to date-level precision (2026-08-19T00:00:00Z) since exact call time wasn't independently provable — explicitly caveated in `jm1pub_authorresponsesummary`, not silently overstated |
| Recorded At | `jm1pub_nextstageauthorizedon` + execution log `jm1_startedon`/`jm1_completedon` | The actual timestamp this capture occurred |
| Artifact Binding | `jm1pub_deliverableartifactid` (lookup to `jm1pub_editorialartifact`) | Mandatory; the target artifact record did not previously exist in Dataverse and was registered first (see 05) |
| Attestation | embedded in `jm1pub_authorresponsesummary` | "operator confirms the author approved this exact version to proceed" |

No new fields were proposed or created.
