# Delivery Failures

Last Verified: 2026-08-15T20:44:30.499Z

| Failure Class | Count | Evidence |
| --- | ---: | --- |
| Certification blockers | 0 | Confirm run 31907003130 |
| Author-review delivery resend during certification | 0 | Confirm route used certifyOperationalDelivery; no dispatch send invoked. |
| Duplicate operational certification on replay | 0 | Replay run 31907358567 returned ALREADY_RELEASED_IDEMPOTENT. |
| Response consumer matched stale author reply | 0 | Post-certification replay processed 0; idempotent 0. |
| Publisher Operating Center public unauthenticated read | 1 protected 401 | API correctly required auth; not a delivery failure. |

No delivery failure requiring author resend was found.
