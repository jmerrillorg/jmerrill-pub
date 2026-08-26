# Founder Autonomy Principle

Last Verified: 2026-08-26T14:34:02.047Z

Canonical principle: if the next governed action is known, prerequisites are satisfied, and no human decision is required, the system must execute or queue it automatically.

This package reconciles `JMP/System` into a bounded execution-state model: `QUEUED`, `PROCESSING`, `RETRYING`, `BACKPRESSURE`, `RECOVERING`, or `FAILED_ATTENTION_REQUIRED`. The controller does not use `JMP/System` as a long-term waiting-owner parking lot.
