# Post-Deploy Proof

Last verified: 2026-08-16T02:38:45Z

Evidence source: production health endpoint and source inspection after PR #513 merge.

Status:

AVAILABLE / PARTIAL CLOSEOUT.

Production health:

- URL: `https://jmerrill.pub/api/health`
- `status`: `ready`
- `release`: `846920e343703f11410bc6cf3ce900f42fc4bc7f`
- `dataverse`: `ready`
- `graph`: `ready`
- `acs`: `ready`
- `authorPortal`: `ready`

Post-deploy code boundary:

- Corrected website-side prospect policy: live in release `846920e343703f11410bc6cf3ce900f42fc4bc7f`.
- Active-author dispatch block regression tests: passed before merge.
- Actual Azure diagnostic sender/resender path: not yet reconciled with corrected prospect state semantics.

Closeout classification:

Production deploy proof passed. Live prospect send proof is held until the sender route is corrected or formally certified as using the corrected prospect contract.
