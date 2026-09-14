# Deployment Readback

## PR #734 deployment

Workflow:

- name = Deploy J Merrill Publishing to Premium App Service
- file = .github/workflows/azure-app-service-premium.yml
- run id = 34895548620
- run url = https://github.com/jmerrillorg/jmerrill-pub/actions/runs/34895548620
- head sha = 235339ccad0f213e248786ebee2f950bf7ef7a34
- result = SUCCESS

Successful steps included checkout, setup Node, install dependencies, deployment guards, build, package, Azure login, runtime configuration, artifact deployment, and health probe.

GitHub emitted a Node.js 20 deprecation annotation and forced Node 24 for the action runtime. This was not a deployment failure.

## Current production deployment

A later main push deployed successfully:

- title = Upgrade technology currency to Next 16
- head sha = 28b2e6fd988c92d5b0045593d43a78b6aa97daac
- workflow run id = 34896255878
- run url = https://github.com/jmerrillorg/jmerrill-pub/actions/runs/34896255878
- result = SUCCESS
- completed at = 2026-09-14T21:02:18Z

Production health subsequently reported:

- status = ready
- release = 28b2e6fd988c92d5b0045593d43a78b6aa97daac
- Dataverse runtime auth mode = MANAGED_IDENTITY
- Graph/SharePoint runtime auth mode = MANAGED_IDENTITY
