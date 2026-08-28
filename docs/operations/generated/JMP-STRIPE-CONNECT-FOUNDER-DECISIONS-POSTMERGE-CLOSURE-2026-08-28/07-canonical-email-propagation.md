# Canonical Email Propagation

Last Verified: 2026-08-28T10:50:39.506Z

| Metric | Count |
| --- | ---: |
| Active authors with canonical email | 56 |
| Missing canonical email | 0 |
| Drift | 0 |

Root Cause Preserved: Connect estate classification previously read contact email opportunistically and did not persist founder-approved current service email into a reusable canonical author/contact authority before enrollment evaluation.

Repair Preserved: Founder-approved emails are stored on canonical Contact.emailaddress1 and Connect enrollment reuses AUTHOR PROFILE -> CONTACT -> CURRENT SERVICE EMAIL.

Future propagation rule: New joins and governed contact email changes must update Contact.emailaddress1 first; Connect enrollment/readiness consumes that Contact authority instead of subsystem-local email reconstruction.
