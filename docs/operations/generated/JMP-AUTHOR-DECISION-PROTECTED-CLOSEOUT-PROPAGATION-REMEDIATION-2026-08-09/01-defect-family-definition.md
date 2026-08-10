# Defect Family Definition

Last verified: 2026-08-10T02:46:15Z

Capability name: Author Decision to Protected Closeout Evidence Propagation.

The three findings are treated as one process defect family:

| Defect class | Remediated by |
| --- | --- |
| Author decision propagation gap | Governed reply classification and strong review-request correlation |
| Awaiting/response-clock closure gap | Closing only the awaiting state belonging to the matched review request |
| Approved artifact/checksum propagation gap | Exact artifact correlation, deterministic checksum requirement, and protected closeout readback |

Required separation is preserved:

| Area | Authority |
| --- | --- |
| Fact reconciliation | May be automated by this process |
| Consequential title-state mutation | Remains separately governed by the protected closeout executor |

