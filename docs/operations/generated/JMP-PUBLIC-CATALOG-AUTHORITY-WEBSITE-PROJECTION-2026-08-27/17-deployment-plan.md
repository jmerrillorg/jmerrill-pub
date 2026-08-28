# Deployment Plan

Last Verified: 2026-08-27T22:56:00-04:00

Deployment should follow the existing repository App Service deployment path after PR approval/merge.

Post-deployment required checks:

- `/api/health` returns healthy/degraded without fatal failure;
- `/api/public-catalog` returns JSON projection, not a 404 page;
- `/books` renders from Dataverse-backed catalog path;
- at least one projected `/books/{slug}` page returns HTTP 200;
- at least one projected `/authors/{slug}` page returns HTTP 200 where public author profile is required;
- sitemap includes projected book and author pages when Dataverse credentials are present.
