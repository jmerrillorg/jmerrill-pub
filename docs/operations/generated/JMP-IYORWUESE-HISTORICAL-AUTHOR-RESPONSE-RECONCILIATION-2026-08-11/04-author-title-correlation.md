# Author and Title Correlation

Last Verified: 2026-08-11T11:23:46Z

## Correlation Inputs

The quoted outbound content in the source message carried the Author Operating Center package identifiers:

| Field | Value |
| --- | --- |
| Title ID | 2d21ab5b-4d80-f111-ab0f-7c1e525b15c2 |
| Stage ID | c2799c31-8f80-f111-ab0f-00224820105b |
| Package ID | 2d21ab5b-4d80-f111-ab0f-7c1e525b15c2:c2799c31-8f80-f111-ab0f-00224820105b:current-author-package |
| Gate ID | 576b9a51-688e-f111-8077-7c1e525b15c2 |
| Action | review-package |

## Dataverse Title Readback

| Field | Value |
| --- | --- |
| Table | jm1pub_titles |
| Title ID | 2d21ab5b-4d80-f111-ab0f-7c1e525b15c2 |
| Title name | The General's Will and Last Testament |
| Author name | Iyorwuese Hagher |
| Stage | 100000006 - Editorial |
| State | Active |
| Status | Active |

## Dataverse Gate Readback

| Field | Value |
| --- | --- |
| Table | jm1pub_editorialapprovalgates |
| Gate ID | 576b9a51-688e-f111-8077-7c1e525b15c2 |
| Gate name | Developmental Editing Author Review - The General's Will and Last Testament |
| Linked title ID | 2d21ab5b-4d80-f111-ab0f-7c1e525b15c2 |
| Linked stage ID | c2799c31-8f80-f111-ab0f-00224820105b |
| Gate status | 196650001 - Ready for Author Review |
| Author decision before write | null |

## Result

Identity correlation: PASS.

Thread/package/title correlation: PASS.

