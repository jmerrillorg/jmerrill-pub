# 20 - Implementation Waves

| Wave | Purpose | Scope | Production Risk | PR Boundary | Commissioning Evidence |
|---|---|---|---|---|---|
| A | Lifecycle Authority | Registry, adapters, validation, no live migration | Low | One canonical lifecycle registry exists | Unit tests prove all current labels map or fail closed |
| B | Operating Center Read Model | Canonical state projection, Waiting On, System Attention | Medium | Operating Center consumes registry read-only | Snapshot tests and live read-only comparison |
| C | Front Door / Classification | Intake handoff, Classification, Editorial Review readiness | Medium | Prospect stages use canonical transitions | Intake/diagnostic tests and one read-only live queue proof |
| D | Commercial / Relationship | Payment event, Joined the Family, onboarding, referral earning | Medium/High | Relationship state derives from agreement/payment events | Stripe/Dataverse event replay tests, no money movement in test |
| E | Editorial | Developmental, Line, Copy, author gates, artifact lineage | High | One editorial stage family at a time | Line runtime defect closed before active execution |
| F | Book Production | Layout, Proof, Final Author Approval, Production Finalization | High | Production project/task/title adapter | Production task/title lineage proof |
| G | Cover / Metadata / Distribution | Cover dependencies, metadata, format readiness, distribution review | High | Distribution readiness cannot bypass final approval | Format/asset/distribution proof package |
| H | Release / Stewardship | Release closure, royalties, rights, title health, post-publication | Medium | Post-publication stage persists after release | Royalty/reporting/readback proof |

## Hard Rule

One mutation domain per wave. Do not combine classification rewrite, payment webhook, Copy runtime, and distribution migration into one PR.
