# Exception Queue

Last Verified: 2026-08-22T00:09:38Z

## Exception Summary

| Reason | Count | Waiting On |
| --- | ---: | --- |
| DUPLICATE_EMAIL_REVIEW | 2 | Operator identity review |
| OTHER_DATA_QUALITY_HOLD | 64 | Contact/email reconciliation before Stripe account creation |

## Exception Handling

For every held row, the next safe action is identity reconciliation against governed JMP author data. Do not create accounts from Bill.com `Vendor Name` alone.

Allowed evidence sources:

1. Existing Stripe Connect account linkage
2. Dataverse Contact / Author Relationship
3. Exact email match
4. Exact normalized author name
5. Bill.com record as source evidence

Fail closed on conflicting names, shared household email, historical alias, deleted author status, or inactive author ambiguity.

No sensitive Bill.com fields are included in this exception queue.

