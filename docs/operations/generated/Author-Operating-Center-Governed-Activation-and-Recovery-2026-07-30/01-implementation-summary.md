# Author Operating Center Governed Activation and Recovery

Date: 2026-07-30
Program: PROGRAM-002
Scope: Author Operating Center activation and recovery trust boundary
Status: IMPLEMENTED FOR REVIEW

## Governed Model

The activation code is treated as business identity verification for canonical Contact selection. It is not a durable authentication credential.

Routine Author Operating Center access is governed by Microsoft External ID authentication and the immutable External ID object identifier stored on the existing Dataverse Contact in `externaluseridentifier`.

## Implemented Outcomes

- One-time activation and recovery code records now carry an explicit purpose and must be active, unexpired, unconsumed, unrevoked, and Contact-bound.
- Contact-bound activation and recovery codes direct the author to Microsoft sign-in instead of minting a permanent author workspace session by code alone.
- Valid Contact-bound codes create a short-lived signed activation transaction and the completion endpoint binds the authenticated Microsoft External ID object ID to the existing Contact before issuing the workspace session.
- Universal/master-code fallback grants are disabled in production when no governed Contact-bound registry record exists.
- Durable author sessions now carry the Microsoft External ID object identifier when present.
- Author context, artifact download, and marketing-profile routes resolve by `externaluseridentifier` before any email-compatible fallback.
- External ID binding decisions fail closed on missing Contact, missing object ID, or identity conflict unless governed recovery is explicitly authorized.
- The author-facing gate states that J Merrill Publishing never needs the author's password and that recovery uses staff verification plus a one-time recovery code.
- Deployment guards now run the activation/recovery regression suite in both Static Web Apps and App Service workflows.

## Boundaries Preserved

- No duplicate Contact creation.
- No duplicate title relationship creation.
- No password capture or storage.
- No secret exposure.
- No Stripe action.
- No payout action.
- No broad author rollout.
- No production deployment executed by this package.

## Runtime Notes

The source package is ready for normal review and deployment validation. A live Carolyn pilot activation remains gated on author-controlled Microsoft sign-in and governed operator participation; Cody must not ask for or retain any author password, one-time Microsoft code, raw activation code, session cookie, or secret.
