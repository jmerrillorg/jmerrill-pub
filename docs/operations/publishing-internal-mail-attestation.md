# Publishing Internal Mail Attestation

The existing response worker reads `security/internal-mail/active-attestation.json`
from the private Publishing stage-runtime container. Only a complete, fresh
administrator readback for the existing tenant, Function application and two
exact mailbox identities can authorize the internal-message validation path.
Maximum lifetime remains 24 hours. No header alone establishes trust. Native
Publishing mailbox custody, exact sender, Microsoft mailbox-origin chain,
original thread and reviewed version remain required. Expiry does not invalidate
previously recorded decisions; it holds new authentication-dependent processing.
External authentication and outbound receipt/delivery reads remain separate.

## Supported Renewal

An already-authorized Exchange administrator runs:

```sh
node scripts/refresh-publishing-internal-mail-attestation.cjs --publish --evidence=<existing-governed-evidence-directory>/<unique-name>.json
```

The command uses the existing Azure administrator session and Exchange InvokeCommand
read operations: Get-InboundConnector, Get-TransportRule, Get-Mailbox for the two
specified identities, Test-ApplicationAccessPolicy and
Test-ServicePrincipalAuthorization for those mailboxes.
It rejects incomplete results, identity drift, unexpected connectors/rules and
scope drift. It writes immutable history before compare-and-swap replacement of
the active feed, then independently reads it back. It never grants permissions,
changes mailbox configuration, sends mail or invokes the worker. No credentials
are stored in the feed or printed.

The feed's scoped RBAC evidence is not a claim that separately assigned Entra
permissions are absent or restricted. Mailbox permission expansion is prohibited.
Renewal requires existing administrator and private storage access. The Function's
Mail.Read grant alone is not Exchange configuration-reader authority. This change
does not add Exchange.ManageAsApp or install a scheduler. An administrator-owned
renewal facility must be separately identified before unattended renewal can be
called commissioned. Until then the expiry is a real operating limit, not a date
to extend by editing configuration.

The October 22 Azure administrator could perform Exchange reads, but its direct
storage write returned AuthorizationPermissionMismatch (403). No credential swap
or grant bypass was used. The protected source release carries that fresh readback
as a bounded bootstrap, using the existing reviewed-release authority. It is used
only when the feed is absent, never for a present invalid feed or storage denial.
Its original 24-hour deadline is unchanged. This permits bounded recovery but does
not commission unattended renewal. The unresolved feed-publisher access must be
addressed explicitly before claiming continuing renewal.

## Recovery and Rollback

Invalid, expired, unavailable or public evidence fails internal validation closed.
Correct the evidence producer and publish a fresh readback; preserve all messages,
decisions, reservations and prior history. The scheduled worker retries existing
captured messages without another author response. Existing recorded directions
retain their original authentication evidence on replay. Rollback to the previous
reviewed release or remove the active feed only under the existing release controls;
neither action authorizes use of expired historical evidence.

October 20 recovery is limited to five exact reply hashes and the prior reviewed
action versions. It records limited editorial decisions, checks artifact custody,
applies the three approved Til Death passages, and publishes separate readable
title records. It sends no duplicate acknowledgment and never approves Stage 07
or advances Stage 08. Unknown or qualified replies require editorial review.
