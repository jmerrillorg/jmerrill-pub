# Package Locator Containment

PACKAGE_LOCATOR_CONTAINMENT_REQUIRED = YES

## Classification

The exposed material is an HTTPS Azure Blob package locator carrying a SAS
bearer credential and referenced through the App Service
`WEBSITE_RUN_FROM_PACKAGE` mechanism. Its effective scope is read access to the
addressed deployment package for the permissions and time window encoded in
the SAS.

The retained PUB-R2 evidence intentionally omits the locator and its query
fields. The SAS signing subtype and exact expiration therefore cannot be
determined from safe retained evidence without re-reading the credential.
Treat it as currently valid and exposed until explicit invalidation is proven.

Replacing `WEBSITE_RUN_FROM_PACKAGE` or deploying a new package does not, by
itself, invalidate the old SAS URL. The old credential can remain usable until
expiry or revocation, and an old URL may become useful again if its blob name
is reused.

## Minimum authorized containment action

1. Obtain separate Azure security-remediation and production-change authority.
2. Determine the SAS signing subtype in a protected operator context without
   logging or copying the locator.
3. Build the reviewed commit through the canonical GitHub Actions OIDC
   workflow and persist it under a new immutable blob name.
4. Move the Function App to the new package locator or an identity-based
   package-access mechanism. Never reuse the exposed locator.
5. Invalidate the old credential according to its signing subtype:
   - Stored access policy SAS: expire or remove the referenced policy.
   - User-delegation SAS: revoke user-delegation keys after impact review.
   - Ad hoc account-key service SAS: rotate the signing account key after
     dependent-use review.
6. Keep the old immutable blob name retired; do not upload a replacement to it.
7. Prove the old locator is denied from a protected operator context without
   recording it, then record only pass/fail, timestamp, and change identifier.
8. Verify the new release SHA, 52 registrations, `/api/health` HTTP 200,
   inbound health, running state, and zero duplicate communication effects.

No containment mutation was performed by PUB-R2A.
