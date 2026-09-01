# Legacy Fallback Analysis

Last Verified: 2026-09-01T23:40:56.677Z

Finding: legacy/raw rows could still influence visible title state indirectly through primary-row selection.

Remediation: `titleItemsToOperatingCard` now calls `selectGovernedProjectionPrimaryItem` before deriving card-visible lifecycle fields. The selector scores candidate rows by current operational authority, stage trust, waiting trust, artifact trust, and system-attention severity. Production/workload rows remain available as diagnostics/timeline evidence, but they no longer outrank a trusted governed projection for visible lifecycle state.
