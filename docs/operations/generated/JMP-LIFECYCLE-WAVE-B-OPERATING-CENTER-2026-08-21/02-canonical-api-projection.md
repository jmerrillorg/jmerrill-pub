# 02 - Canonical API Projection

API path: `/api/publisher/operating-center`

Server source:

- `buildPublisherOperatingCenterSnapshot`
- `buildTitleOperatingView`
- `titleItemsToOperatingCard`
- `projectCanonicalPublisherLifecycle`

Flow:

sources -> server read model -> canonical lifecycle adapter -> API snapshot -> UI.

The React client does not translate lifecycle codes independently. It renders `card.canonicalLifecycle` emitted by the server snapshot.
