# Projection Dependency Map

Dataverse title/intake/asset/stage/opportunity/log reads flow into `buildPublisherOperatingCenterSnapshot`, `buildPublisherToday`, `buildTitleOperatingView`, `titleItemsToOperatingCard`, `projectCanonicalPublisherLifecycle`, the `/api/publisher/operating-center` route, and the Publisher Operating Center UI. Wave 2 inserts the canonical authority boundary in `projectCanonicalPublisherLifecycle` and carries Wave 1 fields through queue, workload, and portfolio items before UI/API projection.
