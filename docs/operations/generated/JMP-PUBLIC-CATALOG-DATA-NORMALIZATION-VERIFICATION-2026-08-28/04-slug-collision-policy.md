# Slug Collision Policy

Last Verified: 2026-08-28T08:17:14.058Z
When Dataverse contains duplicate public title slugs, the projection preserves the first deterministic title identity by title/id ordering on the base slug and appends a stable title-ID suffix to the other participants. Title ID remains the identity; the projected slug is the public route.

```json
{
  "policy": "When Dataverse contains duplicate public title slugs, the projection preserves the first deterministic title identity by title/id ordering on the base slug and appends a stable title-ID suffix to the other participants. Title ID remains the identity; the projected slug is the public route.",
  "duplicateSlugsBefore": [
    "god-s-nudge",
    "the-master-s-piece",
    "warrior-s-breed"
  ],
  "duplicateSlugsAfter": [
    "god-s-nudge",
    "the-master-s-piece",
    "warrior-s-breed"
  ],
  "repairedGroups": {
    "warrior-s-breed": [
      {
        "id": "fec27b7a-cc7a-f111-ab0f-6045bdd69435",
        "title": "Warrior's Breed",
        "priorSlug": "warrior-s-breed",
        "projectedSlug": "warrior-s-breed"
      },
      {
        "id": "935f72d0-c27a-f111-ab0f-6045bdd69738",
        "title": "Warrior's Breed",
        "priorSlug": "warrior-s-breed",
        "projectedSlug": "warrior-s-breed"
      }
    ],
    "the-master-s-piece": [
      {
        "id": "c3f603d3-c27a-f111-ab0f-000d3a14673b",
        "title": "The Master's Piece",
        "priorSlug": "the-master-s-piece",
        "projectedSlug": "the-master-s-piece"
      },
      {
        "id": "733cd77a-cc7a-f111-ab0f-6045bdd69678",
        "title": "The Master's Piece",
        "priorSlug": "the-master-s-piece",
        "projectedSlug": "the-master-s-piece"
      }
    ],
    "god-s-nudge": [
      {
        "id": "1c3274cd-c27a-f111-ab0f-6045bdd69435",
        "title": "God's Nudge",
        "priorSlug": "god-s-nudge",
        "projectedSlug": "god-s-nudge"
      },
      {
        "id": "7e000573-cc7a-f111-ab0f-7c1e525b15c2",
        "title": "God's Nudge",
        "priorSlug": "god-s-nudge",
        "projectedSlug": "god-s-nudge"
      }
    ]
  }
}
```
