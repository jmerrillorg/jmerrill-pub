# Timer Watchdog

Last verified: 2026-08-27T10:30:00Z

Scheduler command:

`npm run stripe-connect-reminder-cadence`

Evaluator frequency:

Daily or current governed scheduler frequency.

Reminder frequency is governed by eligibility timestamps, not by how often the worker runs.

Current route:

The cadence evaluator is implemented as a governed script/watchdog command and is ready for binding into the existing scheduler. Broad live sends remain blocked until fresh Stripe readback succeeds from the execution environment.

