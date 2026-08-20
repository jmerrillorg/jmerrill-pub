# Referral Selection Flow

Last verified: 2026-08-20

## Rule

Returning-author benefit is automatic. Referral credits are selectable.

## Combined Cap

Maximum combined benefit:

`50%`

Example:

- returning-author benefit: 20%;
- referral bank: 40%;
- maximum usable referral: 30%;
- selectable referral choices: 0%, 10%, 20%, 30%;
- remaining referral after selecting 30%: 10%.

## Lifecycle

Current bounded lifecycle used in preview:

```text
AVAILABLE
→ SELECTED
→ RESERVED
→ APPLIED
```

Preview behavior:

- selection may be shown;
- no credit is reserved;
- no credit is applied;
- no credit is consumed;
- restoration remains available until a later governed binding point is approved.

## Open Governance Note

Good-standing expiration/forfeiture is not defined in this PR.

Marker:

`GOOD_STANDING_DEFINITION_PENDING`
