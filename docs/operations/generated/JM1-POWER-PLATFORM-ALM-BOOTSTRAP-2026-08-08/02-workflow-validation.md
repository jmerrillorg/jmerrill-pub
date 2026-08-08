# Workflow Validation

The workflow is scoped to `JM1PublishingSales` and validates:

- solution name;
- solution version;
- approved source SHA;
- production target URL;
- production environment ID;
- production organization ID;
- GitHub OIDC identity;
- protected environment `jm1-power-platform-production`.

The workflow does not deploy arbitrary solutions.
