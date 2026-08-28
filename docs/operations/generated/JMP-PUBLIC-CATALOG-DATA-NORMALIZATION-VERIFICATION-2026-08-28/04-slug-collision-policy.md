# Slug Collision Policy

Last Verified: 2026-08-28T08:23:19.373Z
When Dataverse contains duplicate public title slugs, the projection preserves the first deterministic title identity by title/id ordering on the base slug and appends a stable title-ID suffix to the other participants. Title ID remains the identity; the projected slug is the public route.

```json
{
  "policy": "When Dataverse contains duplicate public title slugs, the projection preserves the first deterministic title identity by title/id ordering on the base slug and appends a stable title-ID suffix to the other participants. Title ID remains the identity; the projected slug is the public route.",
  "duplicateSlugsBefore": [],
  "duplicateSlugsAfter": [],
  "repairedGroups": {}
}
```
