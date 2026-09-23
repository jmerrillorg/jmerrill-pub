# Stranded Intake Outreach Guard

Last Verified: 2026-08-29T12:04:54Z

Prior audit surfaced seven potentially stranded intake leads. This package does not send outreach to those leads.

New rule:

- A stranded or incomplete intake may not automatically produce a missing-manuscript or missing-information request until the author-request precheck proves the author is needed.
- If JMP can recover or bind the evidence internally, the system performs recovery first.
- If evidence is missing and the author is the right person to resolve it, the message must be human-first, current, and cadence-eligible.

Result:

- Stranded-intake outreach is guarded.
- No automatic missing-manuscript requests were sent.
- No unrelated author communication was mutated.

Evidence Source: `evaluateTruthBeforeRequest` and Jackuline regression tests.
