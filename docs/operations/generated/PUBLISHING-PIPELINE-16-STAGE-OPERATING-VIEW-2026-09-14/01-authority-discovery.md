# Authority Discovery

## Existing Operating Center Route

ROUTE =
/publisher/operating-center

PAGE =
app/publisher/operating-center/page.tsx

CLIENT =
app/publisher/_components/PublisherOperatingCenterClient.tsx

API =
app/api/publisher/operating-center/route.ts

SERVER_MODEL =
lib/server/publisher-operating-center.ts

The existing route authenticates with `getPublisherOperatingCenterSession()` and calls `buildPublisherOperatingCenterSnapshot()`.

## Operating Center Source Architecture

`buildPublisherOperatingCenterSnapshot()` reads Dataverse-backed operating data and builds:

- enterprise intake queue
- proof-asset queue
- workload queue
- portfolio views
- production command queues
- author-response queue
- royalty queue/read model
- Publisher Today snapshot
- title operating view

The title operating view already consumes canonical lifecycle projection logic from:

- lib/publishing/lifecycle/registry.ts
- lib/publishing/lifecycle/legacy-mapping.ts
- lib/publishing/lifecycle/operating-center-read-model.ts

## Lifecycle Authority

TITLE_IDENTITY =
Dataverse title and governed Operating Center projection

AUTHOR =
Dataverse contact/intake/title relationships and governed projection evidence

CURRENT_STAGE =
Publisher Operating Center titleOperatingView canonical lifecycle read model

SUBSTAGE =
Canonical lifecycle read model substage

WAITING_ON =
Canonical waitingTruth and Operating Center owner/read-model fields

ATTENTION_STATE =
Canonical systemAttention plus card urgency/blocker state

BLOCKER =
Canonical waitingTruth/systemAttention, card blocker, and Operating Center dependency fields

NEXT_ACTION =
Canonical nextGovernedAction with Operating Center fallback

PACKAGE =
Canonical packageAccepted/packageRecommendation/current artifact review state

IMPRINT =
Canonical confirmed/recommended/working imprint fields when present

PUBLICATION_STATE =
Portfolio, distribution, publication, and post-publication fields in the Operating Center snapshot

## Mini-App Disposition

STANDALONE_FILE =
/Users/jmerrillone/Developer/jmp-pipeline.html

DISPOSITION =
FORENSIC_REFERENCE_ONLY

The standalone HTML mini-app preserves the useful visual concept of a horizontal kanban board, but it is not treated as lifecycle authority and was not copied as a data store.

