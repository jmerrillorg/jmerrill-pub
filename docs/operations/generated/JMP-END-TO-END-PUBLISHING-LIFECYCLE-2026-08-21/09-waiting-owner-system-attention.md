# 09 - Waiting Owner and System Attention

## Rule

Primary Waiting On and System Attention are different fields.

## Required Waiting Owners

Prospect, Author, JMP, JMP/System, External.

## Current Evidence

The Operating Center already projects `waitingOn`, `actionOwner`, `businessOwner`, `executionOwner`, `systemAttentionFlag`, `currentBlocker`, and `recommendedNextAction`. Live gates show author waits, system delivery-certification waits, and runtime holds.

## Gap

Because the Operating Center derives labels from workload states and latest rows instead of a canonical registry, some holds are visible only through prose in gate summaries. Example: General's Will Line Editing is eligible but held by pipeline-alignment remediation.

## Proposed Registry Behavior

Every stage must define:

- primary waiting owner;
- system attention trigger;
- next governed action;
- hidden dependency check;
- author-facing delay explanation.
