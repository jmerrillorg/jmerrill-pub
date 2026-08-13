# Dataverse Storage And Access Boundary

Last Verified: 2026-08-13T04:06:50Z

## Storage Validation

| Item | Result |
| --- | --- |
| Customer Voice survey response table | `msfp_surveyresponses` |
| Customer Voice question response table | `msfp_questionresponses` |
| Internal validation response created | YES |
| Internal validation response ID | `2a9654f6-c996-f111-8076-000d3a14673b` |
| Internal validation question responses | 9 |
| Staging validation response created | YES |
| Production validation response created | YES |
| Production validation response ID | `5ab8a564-cc96-f111-8076-6045bdd69435` |
| Production validation question responses | 9 |
| Source identifier preserved | `JMP-CV-01A-AUTHOR-EXPERIENCE` |
| Respondent classification | Anonymous website respondent |

## Access Boundary

The Publishing survey uses a Publishing-specific project, survey, source identifier, and public URL. It does not reuse or mutate the J Merrill Financial CV-01A project, survey, questions, or responses.

| Boundary | Result |
| --- | --- |
| Publishing project isolated | PASS |
| Publishing survey isolated | PASS |
| Publishing source identifier isolated | PASS |
| Financial records modified | 0 |

## Local Credential Note

The local built app returned the public page successfully. A local POST using copied App Service settings failed at `dataverse_token_failed` because App Service-secret resolution is not reproduced by copying the setting names into a local shell. Direct Dataverse storage validation using the signed-in governed Dataverse token passed.

The deployed App Service route was tested after governed deployment and wrote a production validation response to Customer Voice storage.
