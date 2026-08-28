# Author Estate Projection

Last Verified: 2026-08-27T22:56:00-04:00

Public author pages are generated from `listPublicAuthors()` and `getPublicAuthorBySlug()` in `lib/server/dataverse/catalog.ts`.

The projection:

- includes only active Dataverse contacts marked as authors;
- applies the governed public author identity resolver;
- suppresses hidden/anonymous personal author profiles where required;
- groups public titles by canonical author slug;
- returns sanitized public author fields from `/api/public-catalog`;
- emits author JSON-LD from projected public fields.

The author route remains:

`/authors/{canonical-author-slug}`
