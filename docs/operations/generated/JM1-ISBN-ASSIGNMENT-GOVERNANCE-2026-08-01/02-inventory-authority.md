# ISBN Inventory Authority

## Canonical Inventory Fields

| Field | Required |
| --- | --- |
| ISBN | Yes |
| Bowker prefix/block | Yes |
| Status | Yes |
| Title ID | When reserved or assigned |
| Edition | When reserved or assigned |
| Format | When reserved or assigned |
| Imprint | When reserved or assigned |
| Assignment date | When assigned |
| Assigned by | When assigned |
| Bowker registration status | Yes |
| Distributor registration status | Yes |
| Barcode status | Yes |
| Notes | Optional |

## Allowed Statuses

- AVAILABLE
- RESERVED_PENDING_APPROVAL
- ASSIGNED
- REGISTERED
- PUBLISHED
- VOIDED_WITH_REASON

An assigned or voided ISBN must never return to AVAILABLE.

## Registration Tracking

Assignment does not prove external registration. Track these independently:

- ISBN assigned;
- Bowker metadata registered;
- copyright page updated;
- barcode generated;
- Ingram metadata accepted;
- CoreSource metadata accepted;
- final proof certified.
