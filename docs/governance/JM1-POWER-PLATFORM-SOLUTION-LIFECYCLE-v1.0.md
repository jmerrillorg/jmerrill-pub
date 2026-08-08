# JM1 Power Platform Solution Lifecycle v1.0

Classification: CANONICAL GOVERNANCE STANDARD / POWER PLATFORM ALM

Status: ALM / DEPLOYMENT ENABLEMENT ONLY

## Purpose

JM1 Power Platform work must move through a governed development-to-production lifecycle. The standard exists to prevent ad hoc production customization and to make Publishing Power Platform changes source-controlled, validated, protected, deployable, and auditable.

## Required Lifecycle

Development environment -> source-controlled solution -> validation -> package -> protected production import -> production readback -> evidence -> rollback or hold.

Production is never the development environment.

## Protected Deployment Rule

Production Power Platform deployment must use:

- a workflow present on the default branch;
- a protected GitHub environment;
- secretless GitHub OIDC where supported;
- exact solution-name validation;
- exact solution-version validation;
- exact approved source SHA validation;
- target environment URL, environment ID, and organization ID validation;
- evidence preservation.

Jackie's interactive identity is not the normal deployment identity.

## Current Bootstrap Scope

This standard enables the deployment mechanism only. It does not authorize:

- Tranche 1 runtime configuration;
- production business configuration;
- Business Central posting;
- author communication;
- client-title automation thaw.
