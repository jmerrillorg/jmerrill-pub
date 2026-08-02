# Known Limitations

1. The exact raw SAS value was intentionally not re-read, reproduced, or retained. Expiry could not be recorded from the raw URL without violating the containment boundary.
2. GitHub secret values are not readable through the GitHub API; only secret names were inspected. No suspicious package/SAS secret names were present.
3. Operator lacked Storage Blob Data RBAC for direct OAuth data-plane listing, so storage account keys were retrieved and used in memory for metadata operations only. Key values were not printed, written, or retained.
4. Protected live routes were validated by fail-closed probes. No live synthetic email or diagnostic execution with credentials was invoked during this hygiene pass to avoid duplicate communication or editorial side effects.
5. No Dataverse execution event was written in this pass because no approved event-writing path was available in the repository context without risking taxonomy drift. The recommended payload is captured in the evidence index for governed writeback through an approved event type.

