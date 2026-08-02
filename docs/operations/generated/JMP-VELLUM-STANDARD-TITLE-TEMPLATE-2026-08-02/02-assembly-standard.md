# Vellum Assembly Standard

## Vellum-Native Structure

The governed Vellum master contains the intended title architecture:

Half Title, Title Page, Copyright, Disclaimer Block, Dedication, Epigraph, Contents, Blurbs, Foreword, Preface, Introduction, Chapters, Afterword, Notes, Bibliography, Acknowledgments, Also By, About the Author, About the Publisher, and Connect / CTA.

This structure must be populated, removed, or retained based on the active title record. Do not recreate this structure in a competing non-Vellum layout system.

## Internal Template State

The master may contain placeholders, sample chapters, sample blurbs, disclaimer options, instructional content, optional sections, format placeholders, and metadata fields.

## Active Title State

An active title clone may contain only verified title metadata, selected front matter, approved manuscript content, applicable back matter, contracted formats, approved disclaimer, and title-specific credits.

Required guard:

`INTERNAL_TEMPLATE_CONTENT_EXPOSED`

## Sample Removal Step

For every active title:

1. Clone the governed Vellum master.
2. Bind the clone to the canonical title record.
3. Remove all sample content.
4. Remove unused chapters.
5. Remove unused blurbs.
6. Remove placeholder dedication and epigraph text.
7. Remove sample bibliography entries.
8. Remove sample Also By entries.
9. Remove sample author biography text.
10. Remove unused optional Vellum elements.

Required result:

Sample content remaining: 0
Placeholder content remaining: 0
Unused optional sections: 0

