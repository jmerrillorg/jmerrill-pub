# BPF and Connection Dependency Proof

Last verified: 2026-08-07

## Business Process Flow

The `jm1pub_publishingopportunityprocess` BPF entity is present in the source-controlled `JM1PublishingSales` solution boundary.

Evidence:

- `powerplatform/solutions/JM1PublishingSales/src/Other/Solution.xml`
- `powerplatform/solutions/JM1PublishingSales/src/Entities/jm1pub_publishingopportunityprocess/Entity.xml`
- `powerplatform/solutions/JM1PublishingSales/src/Workflows/PublishingOpportunityProcess-5242571D-D8C6-F011-BBD3-6045BDA81E56.xaml`

Current source stage labels:

1. Discovery
2. Submission
3. Editorial Review
4. Package & Quote
5. Contract
6. Activation

No BPF redesign was performed.

## Connection References and Environment Variables

No solution-level connection-reference component and no solution-level environment-variable component were found in the exported `JM1PublishingSales` baseline.

Evidence:

- `powerplatform/solutions/JM1PublishingSales/connection-references-and-environment-variables.md`
- source search across `powerplatform/solutions/JM1PublishingSales/src/`

No secrets were printed or committed. No connector bindings were changed.
