# Future Author Onboarding

Last Verified: 2026-08-22T00:09:38Z

## Recommended Trigger

Future authors should receive Author Payout Enrollment as part of author onboarding after the author relationship exists and before the first royalty payment is due.

Governed trigger:

```text
JOINED_THE_FAMILY
→ Author Workspace / onboarding
→ Author Payout Enrollment task
```

Recommended deadline:

```text
REQUIRED_BEFORE_FIRST_ROYALTY_PAYMENT
```

## Production Boundary

Incomplete payout enrollment must not block manuscript production by itself. It should block royalty disbursement readiness only.

Correct visible state:

```text
ROYALTY_PAYOUT_SETUP_REQUIRED
```

Incorrect visible state:

```text
PRODUCTION_NOT_READY
```

unless another production prerequisite is actually missing.

