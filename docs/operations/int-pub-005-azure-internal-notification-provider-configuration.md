# INT-PUB-005 Azure Internal Notification Provider Configuration

## Purpose

PR #101 defines the governed Azure app settings path required before the controlled internal author-draft review notification test can send one internal notification.

This configuration is internal-only. It does not authorize author email, Opportunity creation, Flow D activation, diagnostic execution, broad production automation, or production activation.

## Azure Target

- Function App: `func-jm1-diagnostic-ai-runner`
- Dataverse environment: `dc4b2a13-3dbb-e0d1-95b8-f0e7d3a26e10`
- Internal notification recipient: `publishing@jmerrill.one`

## Required App Settings

| Setting | Safe default | Controlled-test value | Notes |
| --- | --- | --- | --- |
| `JM1_AI_EXECUTION_ENABLED` | `false` | `false` | Separate AI execution gate. Must remain closed. |
| `JM1_INTERNAL_NOTIFICATIONS_ENABLED` | `false` | `true` only during a separately authorized controlled internal test | Internal notification gate. |
| `JM1_INTERNAL_NOTIFICATION_PROVIDER` | unset | `injected` | Only approved provider mode from PR #99. |
| `JM1_INTERNAL_NOTIFICATION_FROM` | unset | internal `@jmerrill.one` mailbox | Must not be `@jmerrill.pub`. |
| `JM1_INTERNAL_NOTIFICATION_REPLY_TO` | unset | internal `@jmerrill.one` mailbox | Must not be `@jmerrill.pub`. |

Provider-specific credentials or secrets must be added only after the provider is separately selected and governed. Do not commit provider secrets, tokens, keys, headers, cookies, or credentials.

## Recipient Rule

The only allowed live internal notification recipient for this phase is `publishing@jmerrill.one`.

The author must never appear in To, CC, BCC, Reply-To as a delivery recipient, hidden recipient lists, or provider payload recipients.

## Sender And Reply-To Rules

- Sender/from must be an internal `@jmerrill.one` mailbox.
- Reply-to must be an internal `@jmerrill.one` mailbox.
- `@jmerrill.pub` is not an active mailbox for this workflow.
- Personal inboxes and arbitrary external recipients are not approved.

## No-Send Readiness Verification

The no-send readiness path returns `READY_FOR_INTERNAL_NOTIFICATION_TEST` only when:

- `JM1_AI_EXECUTION_ENABLED=false`
- `JM1_INTERNAL_NOTIFICATIONS_ENABLED=true`
- `JM1_INTERNAL_NOTIFICATION_PROVIDER=injected`
- `JM1_INTERNAL_NOTIFICATION_FROM` is an internal `@jmerrill.one` mailbox
- `JM1_INTERNAL_NOTIFICATION_REPLY_TO` is an internal `@jmerrill.one` mailbox
- the intended recipient is exactly `publishing@jmerrill.one`
- the author is not present in To, CC, or BCC

The readiness check never sends email, never calls a provider, never runs diagnostics, and never logs secrets.

## Pre-Test Checklist

Before any separately authorized controlled internal delivery test:

1. Confirm `JM1_AI_EXECUTION_ENABLED=false`.
2. Confirm `JM1_INTERNAL_NOTIFICATIONS_ENABLED=false`.
3. Confirm provider mode is governed and set to `injected`.
4. Confirm from and reply-to are internal `@jmerrill.one` mailboxes.
5. Confirm recipient is exactly `publishing@jmerrill.one`.
6. Confirm no author email appears in To, CC, or BCC.
7. Confirm Dataverse logging remains safe and excludes manuscript text, prompt body, raw model output, and secrets.

## Enable Procedure

Use Azure Portal app settings or Azure CLI without printing values. Set only names and governed values required for the controlled test.

```sh
az functionapp config appsettings set \
  --resource-group <resource-group> \
  --name func-jm1-diagnostic-ai-runner \
  --settings \
  JM1_AI_EXECUTION_ENABLED=false \
  JM1_INTERNAL_NOTIFICATIONS_ENABLED=true \
  JM1_INTERNAL_NOTIFICATION_PROVIDER=injected \
  JM1_INTERNAL_NOTIFICATION_FROM=<approved @jmerrill.one mailbox> \
  JM1_INTERNAL_NOTIFICATION_REPLY_TO=<approved @jmerrill.one mailbox>
```

Do not set provider credentials in source files. If a future provider requires credentials, store them only in Azure app settings or an approved secret store.

## Disable Procedure

Immediately after a separately authorized controlled internal delivery test:

```sh
az functionapp config appsettings set \
  --resource-group <resource-group> \
  --name func-jm1-diagnostic-ai-runner \
  --settings \
  JM1_AI_EXECUTION_ENABLED=false \
  JM1_INTERNAL_NOTIFICATIONS_ENABLED=false
```

## Rollback Procedure

If any readiness or delivery check fails:

1. Set `JM1_INTERNAL_NOTIFICATIONS_ENABLED=false`.
2. Confirm `JM1_AI_EXECUTION_ENABLED=false`.
3. Do not retry delivery automatically.
4. Record the safe failure reason in the operational record.
5. Do not send author email, create Opportunity, activate Flow D, or run diagnostics.

## Fail-Closed Rules

Configuration fails closed if:

- `JM1_AI_EXECUTION_ENABLED=true`
- `JM1_INTERNAL_NOTIFICATIONS_ENABLED` is not exactly `true` for live delivery
- provider is missing or unknown
- from mailbox is missing or not internal `@jmerrill.one`
- reply-to mailbox is missing or not internal `@jmerrill.one`
- any `@jmerrill.pub` mailbox is used as a live mailbox
- recipient is not exactly `publishing@jmerrill.one`
- author email appears anywhere in recipient fields
- secrets, tokens, keys, headers, cookies, or credentials would be exposed

## Governance Confirmation

PR #101 is configuration readiness only. It sends no live internal notification, sends no author email, creates no author-facing send event, creates no Opportunity, activates no Flow D, runs no diagnostic, and authorizes no production automation.
