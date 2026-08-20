# Author Offer Engine

## Service

`calculateAuthorOffer(input)`.

## Package Source

Uses the existing governed Milestone 6 package catalog in `milestone6BusinessSourceLayer.js`. This avoids adding a second package-price table.

Current eligible package prices:

- Starter: $1,999.00
- Professional: $4,500.00
- Premier: $7,500.00

## Outputs

The engine returns:

- base package price;
- prior eligible title count;
- returning-author percent;
- referral credits available/requested/applied/remaining;
- valid referral-credit choices;
- combined benefit percent;
- cap applied flag;
- adjusted package principal;
- pricing rule version;
- payment fee policy version;
- payment options;
- tax treatment.

## Version

`JMP_AUTHOR_LOYALTY_REFERRAL_v1.0`

