# Runtime Implementation

Last Verified: 2026-08-27T22:56:00-04:00

Changed runtime files:

- `lib/catalog/public-projection.ts`
- `lib/catalog/types.ts`
- `lib/server/dataverse/catalog.ts`
- `app/api/public-catalog/route.ts`
- `app/books/[id]/page.tsx`
- `app/authors/[slug]/page.tsx`
- `lib/publishing/lifecycle/registry.ts`
- `lib/publishing/lifecycle/validation.ts`

The implementation is a projection and validation layer. It does not create a new catalog source of truth.
