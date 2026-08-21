# Root Cause

## Classification

`SIGNED_AGREEMENT_ARTIFACT_EXISTS_BUT_STRUCTURED_RECORD_MISSING`

## Evidence

The executed agreement existed as an Acrobat Sign-produced PDF in the governed Atta inquiry workspace:

`/Users/jmerrillone/Library/CloudStorage/OneDrive-JMerrillFoundation,Inc/JM1-PUB/01_Pre-Pipeline/00_Inquiry/JMP-INT-202607-422JSZ - Atta Boateng - Untitled/00_Admin/Atta Boateng_Untitled_Contract - signed.pdf`

PDF checksum:

`caec319088a90bd3ee4a98f1017eab46caa57c1a3cd4b7fccc245ff616fa9a85`

Dataverse readback before repair showed:

- Opportunity `131da28b-919c-f111-b8dc-6045bdd69435` had first payment status `Paid Confirmed`.
- `jm1pub_contractstatus` was blank.
- `jm1_m6agreementpreparationstatus` was blank.
- `jm1_m6authorportalstatus` was blank.
- `jm1pub_contracts` returned zero rows for Atta's Opportunity or Contact.

The existing completion automation was SignNow-oriented and expected a machine-readable `jm1pub_contract` row linked to the Opportunity. Atta's executed artifact was Adobe/Acrobat Sign-produced and present in the governed workspace, but no structured contract row, status update, or Opportunity linkage existed. The payment-event consumer therefore correctly failed closed at the time with `JOINED_THE_FAMILY_BLOCKED`, but the underlying cause was not absence of an agreement in reality.

## Systemic Repair

Added a guarded agreement reconciliation route:

`/api/author/agreement/reconcile`

The route:

- accepts an executed agreement fact with artifact path, checksum, provider, timestamps, author, title, and Opportunity;
- creates or repairs one `jm1pub_contract` row;
- binds it to the existing Opportunity and author Contact;
- binds the title to the executed contract when title ID is supplied;
- logs `PUBLISHING_AGREEMENT_EXECUTED`;
- reconciles `JOINED_THE_FAMILY` when initial payment is already confirmed;
- remains order-independent with the existing payment consumer;
- preserves idempotency for agreement replay, payment replay, and reconciliation replay.

The payment consumer now recognizes active/signed agreements regardless of whether the provider status originated from SignNow or Adobe Sign.
