# Global Response Invariant

Last verified: 2026-08-11T11:18:00Z

## Invariant

A governed author reply to a governed JMP decision request must become durable Publishing operational truth automatically, regardless of whether the title is in Pilot, normal runtime, or manual-recovery mode.

## Implemented Flow

Inbound email -> author identity validation -> thread/package/title/decision-request correlation -> decision classification -> author notes persistence -> matching awaiting-state closure -> execution log -> acknowledgement policy evaluation -> next-action projection.

## Proof

`authorReviewResponseConsumer.test.js` covers pilot, normal, and manual-recovery replies through the same runtime path.

