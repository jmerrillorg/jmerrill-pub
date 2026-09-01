# Runtime Fix Specification

Last Verified: 2026-09-01T23:31:15.786Z

Changed files:

- `lib/server/publisher-operating-center.ts`
- `app/publisher/_components/PublisherOperatingCenterClient.tsx`
- `scripts/publisher_operating_center_wave6_ui_projection_alignment.test.mjs`
- `scripts/publisher_operating_center_wave6_ui_projection_alignment_evidence.mjs`

Runtime behavior:

1. Grouped title rows are evaluated through the canonical lifecycle projector.
2. The title-card primary row is selected by governed projection strength, not raw urgency alone.
3. Visible card stage, substage, Waiting On, blocker, next action, and timer come from the selected canonical lifecycle.
4. Raw urgency/workload rows remain in diagnostics/timeline evidence only.
5. No title records, canonical registry, schema, Dataverse records, or workflow definitions are changed.
