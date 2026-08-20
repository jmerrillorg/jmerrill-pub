# Joined the Family Integration

## Canonical Definition

Agreement Executed + Required Initial Payment Received = `JOINED_THE_FAMILY`.

## Relationship Layer

The Offer Engine runs before `JOINED_THE_FAMILY`.

`JOINED_THE_FAMILY` then drives:

- active-author relationship;
- onboarding;
- workspace activation;
- title activation;
- referral qualification if the author was referred.

## Boundary

This PR does not create or mutate Joined the Family events. It only implements the pure referral-credit earning rule that depends on them.

