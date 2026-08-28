# Title Estate Projection

Last Verified: 2026-08-27T22:56:00-04:00

Public title pages are generated from `listPublicCatalogTitles()` and `getPublicCatalogTitleBySlug()` in `lib/server/dataverse/catalog.ts`.

The projection:

- reads only active titles with public catalog status;
- joins publishing assets for format, ISBN, and cover data;
- joins marketplace links for retailer evidence;
- resolves public author attribution before display;
- sorts deterministically by author display name and title;
- emits title JSON-LD from projected public fields.

The title route remains:

`/books/{canonical-title-slug}`
