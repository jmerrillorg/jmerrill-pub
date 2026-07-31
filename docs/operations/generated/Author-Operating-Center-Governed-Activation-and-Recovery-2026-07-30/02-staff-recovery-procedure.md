# Staff Recovery Procedure

Status: GOVERNED PROCEDURE DRAFT FOR REVIEW

## Purpose

Restore an author's Author Operating Center access without creating a duplicate Contact, using password handling, or relying on email address matching as the primary trust mechanism.

## Procedure

1. Verify the author through the governed staff identity-verification process.
2. Resolve the existing canonical Dataverse Contact and title relationships.
3. Confirm whether `externaluseridentifier` is blank, matches the author's current Microsoft External ID object ID, or conflicts.
4. Issue one one-time recovery code with:
   - purpose: `recovery`
   - Contact ID
   - expiration
   - no reusable master semantics
   - no raw code retained in long-lived evidence
5. Direct the author to use the recovery code and then sign in with their own Microsoft account.
6. On successful governed recovery, rebind the same Contact only when staff recovery authorization is present.
7. Consume or revoke all prior activation and recovery codes for the Contact.
8. Revoke existing Author Operating Center sessions through the configured session-secret rotation or session invalidation mechanism.
9. Record an execution log containing identifiers only.

## Prohibited

- Do not ask for the author's password.
- Do not ask for Microsoft one-time sign-in codes.
- Do not create a duplicate Contact.
- Do not trust a different Contact based only on email.
- Do not leave multiple active activation or recovery codes for the same Contact.
- Do not store raw code values in evidence, Dataverse notes, email archives, logs, screenshots, or source.
