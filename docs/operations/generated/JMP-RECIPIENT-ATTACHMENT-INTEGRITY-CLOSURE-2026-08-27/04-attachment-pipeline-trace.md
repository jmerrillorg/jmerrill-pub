# Attachment Pipeline Trace

Last Verified: 2026-08-28T01:36:47Z

## Objects Traced

| Object | Location | SHA256 | Content Relationship |
| --- | --- | --- | --- |
| Dataverse certified artifact | `jm1pub_editorialartifacts(cb07ca7d-b784-f111-ab0f-6045bdd69678)` | `e09414df4b3c42854bba496caca14264a68186467d746be39963d5d5885b9a6b` | Internal wrapper artifact, not recipient content |
| SharePoint corrected author-facing artifact | `01DF3SEQJ2UZF7VZDGHJA2CVQATZXX6RFR` | `c6d1945aae9519c0912d9c699f0fea59a3167084d8e73742b7314f0e3d874fdc` | Same manuscript content as recipient |
| Recipient mailbox attachment | Governed Publishing mailbox message attachment | `9aae176de7b318fec3d4e8c7b9ebf7750433261a4130dffcd14e4a50d4b9abf1` | Same manuscript content as SharePoint corrected artifact |

## Corrected SharePoint Artifact

| Field | Value |
| --- | --- |
| Filename | `2026-08-27-Establishing-Glory-Developmental-Editing-Corrected-Author-Review.docx` |
| Item ID | `01DF3SEQJ2UZF7VZDGHJA2CVQATZXX6RFR` |
| Size | 156324 |
| SHA256 | `c6d1945aae9519c0912d9c699f0fea59a3167084d8e73742b7314f0e3d874fdc` |
| `word/document.xml` SHA256 | `5459ac74942c8c6b0137cbe0db70d146111c8ec7e9f7df0bca0028d6ed996635` |
| Visible text SHA256 | `6f6378eb6ffc6c37671a622583e7f66e0b124be110d4d3a3d831f040f46890f4` |

## Recipient Equality Against Corrected Artifact

| Measure | SharePoint corrected | Recipient attachment | Match |
| --- | --- | --- | --- |
| Byte SHA256 | `c6d1945aae9519c0912d9c699f0fea59a3167084d8e73742b7314f0e3d874fdc` | `9aae176de7b318fec3d4e8c7b9ebf7750433261a4130dffcd14e4a50d4b9abf1` | NO |
| `word/document.xml` SHA256 | `5459ac74942c8c6b0137cbe0db70d146111c8ec7e9f7df0bca0028d6ed996635` | `5459ac74942c8c6b0137cbe0db70d146111c8ec7e9f7df0bca0028d6ed996635` | YES |
| Visible text SHA256 | `6f6378eb6ffc6c37671a622583e7f66e0b124be110d4d3a3d831f040f46890f4` | `6f6378eb6ffc6c37671a622583e7f66e0b124be110d4d3a3d831f040f46890f4` | YES |
| Paragraph count | 1509 | 1509 | YES |
| Word count | 48085 | 48085 | YES |

## Interpretation

The byte difference between the SharePoint corrected artifact and the mailbox attachment is an OOXML container/package difference after provider handling. The author-visible manuscript document XML and visible text are identical.

