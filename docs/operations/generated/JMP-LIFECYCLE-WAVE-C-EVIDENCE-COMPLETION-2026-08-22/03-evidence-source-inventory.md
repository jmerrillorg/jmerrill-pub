# Evidence Source Inventory

| Source family | Current binding | Write authority |
| --- | --- | --- |
| Lifecycle registry | lib/publishing/lifecycle/registry.ts and legacy mapping adapter | read-only |
| Operating Center projection | lib/publishing/lifecycle/operating-center-read-model.ts | read-only |
| Publisher server adapter | lib/server/publisher-operating-center.ts | read-only projection |
| Publisher UI | app/publisher/_components/PublisherOperatingCenterClient.tsx | read-only display |
| Commercial/payment/workspace/distribution registries | represented as explicit DATA_GAP unless source evidence is present | no writes |
