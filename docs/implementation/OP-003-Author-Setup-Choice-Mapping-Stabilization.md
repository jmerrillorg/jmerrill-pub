# OP-003 - Author Setup Choice-Mapping Stabilization

**Status:** Implemented locally  
**Date:** 2026-07-01  
**Scope:** Author setup dropdown payload stabilization  
**Related module:** OP-003 Author Portal MVP

---

## Purpose

Author setup dropdowns now use stable option keys in the browser while the API preserves human-readable labels for review, notification, and compatibility with existing Power Automate flows.

This is directly related to OP-003 because the Author Portal MVP depends on clean author setup, title metadata, production preference, marketing foundation, and readiness signals.

---

## Changed Fields

The following fields now use keyed option objects in `AuthorSetupForm`:

- `genre`
- `manuscriptStatus`
- `publishingGoal`
- `audiobookInterest`
- `w9Status`

The API also normalizes existing production preference keyed options consistently:

- `preferredPrintFormat`
- `preferredTrimSize`
- `interiorColor`
- `paperTypePreference`
- `bindingType`
- `coverFinishPreference`
- `authorPhotoOnBackCover`
- `initialAuthorCopyNeeds`

---

## Payload Behavior

### Before

Some fields sent only human-readable labels:

```json
{
  "genre": "Christian / Faith",
  "manuscriptStatus": "Draft complete",
  "publishingGoal": "Publish and distribute my book"
}
```

### After

The browser sends stable keys, but the API preserves readable labels and adds explicit key fields:

```json
{
  "genre": "Christian / Faith",
  "genreLabel": "Christian / Faith",
  "genreKey": "christian_faith",
  "manuscriptStatus": "Draft complete",
  "manuscriptStatusLabel": "Draft complete",
  "manuscriptStatusKey": "draft_complete",
  "publishingGoal": "Publish and distribute my book",
  "publishingGoalLabel": "Publish and distribute my book",
  "publishingGoalKey": "publish_and_distribute"
}
```

Legacy field names continue to carry readable labels. Automation-safe keys are available through `*Key` fields.

---

## Compatibility

The API accepts both:

- new keyed values, such as `christian_faith`
- legacy label values, such as `Christian / Faith`

Incoming values are normalized before payload construction. This avoids a hard cutover that would silently break older browser sessions or downstream flows expecting labels.

---

## Flow Review Notes

Existing flows that read legacy fields can continue using:

- `genre`
- `manuscriptStatus`
- `publishingGoal`
- `audiobookInterest`
- `w9Status`
- production preference label fields such as `preferredPrintFormat`

New or revised Dataverse mappings should prefer:

- `genreKey`
- `manuscriptStatusKey`
- `publishingGoalKey`
- `audiobookInterestKey`
- `w9StatusKey`
- production preference `*Key` fields

Deployment is safe only if downstream flows either continue consuming legacy readable fields or are explicitly updated to consume the new key fields.

---

## Safety Boundaries

This stabilization does not:

- Modify `/join`.
- Send external communications.
- Create payment links.
- Start production.
- Write Dataverse directly from the website.
- Modify Power Automate.
- Modify Business Central, Stripe, royalties, or author payments.
