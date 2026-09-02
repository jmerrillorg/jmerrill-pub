# Validation Identity Readback

Last verified: 2026-09-02T21:54:39Z

## Expected Synthetic Chain

| Field | Value |
| --- | --- |
| Contact ID | `8b2a87d4-418b-f111-ab10-000d3a1a9efa` |
| Author Profile ID | `0359c9cc-aef8-5053-b902-6acbc3dff551` |
| Title ID | `48e831f0-418b-f111-ab10-000d3a1a9efa` |
| Email | `jm1.gate.w1.synthetic.long+20260729@jmerrill.one` |
| Classification | `INTERNAL_SYNTHETIC` |

## Fresh Live Readback

| Check | Result |
| --- | --- |
| `CONTACT_MATCH_COUNT` | `1` |
| `ACTIVE_AUTHOR_PROFILE_COUNT` | `1` |
| `TITLE_AUTHOR_BINDING_COUNT` | `1` |
| `INTERNAL_SYNTHETIC` | `YES` |
| `CLIENT_OPERATION_ELIGIBLE` | `NO` |
| `STRIPE_ELIGIBLE` | `NO` |
| `COMMERCIAL_ELIGIBLE` | `NO` |

## Evidence Notes

The canonical title-to-author relationship is populated through `jm1pub_title.jm1_primaryauthor` / `_jm1_primaryauthor_value`, not the older `_jm1_author_value` lookup. A first read using `_jm1_author_value` returned null; follow-up read of `_jm1_primaryauthor_value` proved the expected Contact binding.
