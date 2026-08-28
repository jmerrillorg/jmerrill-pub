# Author Email Propagation Root Cause

Last Verified: 2026-08-28T07:53:51.038Z

Root cause: Connect estate classification previously read contact email opportunistically and did not persist founder-approved current service email into a reusable canonical author/contact authority before enrollment evaluation.

Repair: Founder-approved emails are stored on canonical Contact.emailaddress1 and Connect enrollment reuses AUTHOR PROFILE -> CONTACT -> CURRENT SERVICE EMAIL.

Future automatic propagation: New joins and governed contact email changes must update Contact.emailaddress1 first; Connect enrollment/readiness consumes that Contact authority instead of subsystem-local email reconstruction.
