# Pricing Snapshot

## Function

`buildPricingSnapshot(offer, selection)`.

## Snapshot State

Current implementation returns a pure locked-preview structure. It does not write to Dataverse.

## Required Facts Captured

- author;
- title/project;
- package;
- base package price;
- prior eligible title count;
- returning percentage;
- referral credits available/selected/applied/remaining;
- combined benefit;
- cap;
- adjusted package principal;
- payment plan;
- installment principal schedule;
- 4 percent fee schedule;
- tax status;
- pricing rule version;
- decision timestamp.

## Downstream Consumers

Downstream systems should consume the locked snapshot:

- Dynamics Opportunity;
- Agreement / Title Addendum;
- Stripe arrangement;
- Author Workspace;
- Publisher Operating Center;
- Business Central when integrated.

No downstream consumer should recalculate commercial economics independently.

