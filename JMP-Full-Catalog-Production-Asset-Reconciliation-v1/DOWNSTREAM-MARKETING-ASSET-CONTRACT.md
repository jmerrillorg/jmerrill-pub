# Downstream Marketing Asset Contract

Marketing may request a production asset by canonical work ID and required role. The registry returns the selected SharePoint reference only when its state is `GOVERNED_PRIMARY` and its work is Marketing Eligible with no rights hold.

Required response fields:

- canonical work ID
- canonical product ID when format-specific
- production asset key
- SharePoint Drive ID and Item ID
- web URL and current path
- asset type and state
- MIME type and size
- SHA-256 when captured
- last verification time

`PARTIAL`, `MISSING`, and `AMBIGUOUS` never authorize Marketing to pick a plausible file. They create an asset-readiness exception upstream. No timestamp-based fallback is permitted.
