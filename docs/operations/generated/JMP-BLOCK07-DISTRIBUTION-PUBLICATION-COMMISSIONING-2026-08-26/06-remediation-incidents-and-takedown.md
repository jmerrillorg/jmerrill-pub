# Remediation, Incidents, And Takedown

Last Verified: 2026-08-26

## Targeted Remediation

Channel failures do not reset unaffected live channels.

Remediation routing:

- asset defects return to Block 05;
- frozen-fact defects return to Block 06 change control;
- channel defects remain in Block 07 distribution remediation.

## Publication Incidents

Release-blocking incidents block distribution certification until resolved.

## Emergency Takedown

Takedown requested is not treated as takedown verified. The runtime preserves `TAKEDOWN_PENDING` until verification evidence exists.

