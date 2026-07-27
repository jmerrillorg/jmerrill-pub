# JM1-PUB Intake Alerting and Operator Ownership

Status: Active source matrix

## Alert Conditions

| Condition | Owner | Required Context |
|---|---|---|
| Queue depth greater than zero beyond allowed window | Publishing Operations | intake reference, correlation ID, class, retry count, environment, timestamp |
| Repeated retry failures | Publishing Operations + Engineering | intake reference, failed operation, safe error code |
| Poison-message creation | Jackie or delegate | intake reference, operation, classification, retry count |
| No successful queue processing in defined period | Engineering | queue name, environment, last success timestamp |
| Notification failures exceeding threshold | Publishing Operations | intake reference, notification operation, correlation ID |
| Queue authentication/access failure | Engineering + Azure Admin | queue name, environment, identity/configuration surface |

## Sensitive Data Rule

Alerts must not include manuscript content, raw author messages, secrets, tokens, cookies, session material, full contact details, banking/tax data, or Stripe URLs.

## Environment Separation

- Production: `jm1-pub-intake-deadletter-prod`
- Preview/staging: `jm1-pub-intake-deadletter-preview`

Production alerts are operator-actionable. Preview alerts are certification and regression evidence only.

