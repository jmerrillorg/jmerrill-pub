# Rollback Plan

## Current Protected Baseline

- DNS zone remains in Azure DNS.
- Nameservers remain unchanged.
- Existing website records remain unchanged.
- Current MX remains `0 mail.agapeic.org.`
- Current SPF includes `v=spf1 a mx include:_spf.hostpma.pro ~all`.
- Current DMARC is `_dmarc.agapeic.org TXT "v=DMARC1; p=reject;"`.
- No Microsoft 365 or Exchange mailbox mutation was executed.

## Rollback Scope

Because no production mutation was executed, rollback is currently evidence-only: remove no mailboxes, delete no users, and revert no DNS records.

## Future Rollback After Authorized Mutation

If a future authorized pilot mutation fails:

1. Stop further mailbox creation.
2. Preserve audit logs and command transcripts.
3. Remove only newly created pilot shared mailboxes if rollback is approved.
4. Remove only newly added pilot aliases if rollback is approved.
5. Revert only DNS mail records changed for Microsoft 365 cutover if rollback is approved.
6. Keep web, app-service, and nameserver records intact.
7. Do not create, preserve, or restore any `@agapeic.com` route during rollback.
8. Document final state in the evidence package before resuming.

