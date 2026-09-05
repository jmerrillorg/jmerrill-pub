# Future Title Auto-Registration

For every future title, the production workflow must register a file reference when SharePoint returns the created or uploaded item:

1. Require canonical author, work, edition, and product context.
2. Capture Drive ID, Item ID, URL, path, MIME type, size, and modified time from Graph.
3. Derive the Dataverse row ID from `DriveId + ItemId`.
4. Classify the asset role and initial state.
5. Capture SHA-256 for approved primary media.
6. Upsert idempotently; a path move updates metadata without creating a second identity.
7. Recompute work readiness.
8. Expose only governed primary assets to Marketing.

The workflow must stop on missing canonical identity, cross-author evidence, reserved-only ISBNs, or competing primary candidates.
