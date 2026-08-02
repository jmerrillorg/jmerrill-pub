# Known Limitations

## Resource Health Tooling

The Azure CLI Resource Health command was unavailable in the local execution environment due an extension/module failure. This did not block the upgrade because ARM provisioning state, dependent Function App state, HTTPS probes, and post-upgrade storage-account readbacks all passed.

## Cost Precision

Cost Management detail was not exported. Cost posture used Azure Monitor used-capacity metrics and service-role classification. Both affected accounts showed very small used capacity and Function runtime/package containers. Transaction metrics returned no current value. Confidence is medium; monitor transaction cost after the next billing cycle.

## Secret-Safe Dependency Validation

Function App storage bindings likely use account-key connection strings in platform settings. Values were not retrieved or recorded. Dependency identification used Resource Graph matching and ARM resource associations without exposing app settings.

## Irreversibility

The account-kind upgrade cannot be reversed. The documented contingency is workload-level rollback or Microsoft support, not GPv1 downgrade.
