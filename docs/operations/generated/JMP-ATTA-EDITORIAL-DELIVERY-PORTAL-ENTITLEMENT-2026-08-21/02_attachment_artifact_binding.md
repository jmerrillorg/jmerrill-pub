# Attachment / Artifact Binding

Last Verified: 2026-08-21T23:59:00-04:00
Evidence Source: Microsoft Outlook shared mailbox body/readback; Dataverse artifact readback for title ca68c994-fd89-f111-ab10-00224820105b.

## Outlook Evidence

The message body lists two delivered attachments:

| Body-listed attachment |
| --- |
| Untitled - Editor's Notes.pdf |
| Untitled - Editorial Review Guide.pdf |

The Outlook connector confirmed `hasAttachments = true`. Direct byte-level attachment enumeration through the local Graph token returned access denied for the shared-message item, so attachment bytes were not re-downloaded from Outlook in this run.

## Governed Dataverse Artifacts Bound To Title

| Artifact | Dataverse artifact id | Filename | Checksum |
| --- | --- | --- | --- |
| Deliverable editorial assessment | bc3c6522-418c-f111-ab10-00224820105b | 2026-07-30-Editorial-Review-Untitled-Editorial-Assessment.md | 567a47... |
| Author-facing assessment PDF | b72a8918-a998-f111-b8dc-00224820105b | 2026-08-15-Author-Facing Editorial Review Assessment-Untitled-v1.pdf | 5d35d7c7e369f2eaf8d2d4e18b77edef8e3e4fbe34a045d93da1b5d974fd8bdb |
| Author-facing recommended path PDF | 41da811e-a998-f111-b8dc-00224820105b | 2026-08-15-Author-Facing Recommended Editorial Path-Untitled-v1.pdf | 98de1e51... |
| Author-facing instructions PDF | b7bd771d-a998-f111-b8dc-7c1e525b15c2 | 2026-08-15-Author-Facing Editorial Review Instructions-Untitled-v1.pdf | cf2bc31c... |

## Note

The Outlook body uses the historically delivered attachment labels. The current governed artifact records use the later canonical artifact names. This package preserves that distinction rather than rewriting either evidence source.
