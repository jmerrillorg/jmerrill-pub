# OR-2026-002A Cost, Licensing, and Ownership

## Cost Posture

The recommended secure boundary is expected to be low-cost:

- Azure Function or App Service route: minimal incremental compute if hosted in existing JM1 infrastructure.
- Key Vault secret retrieval: negligible at expected schedule frequency.
- Dataverse writes: existing platform usage pattern.
- Power Automate: preserve existing scheduled automation where possible.

## Licensing Considerations

- Power Automate HTTP/custom connector behavior may require premium licensing depending on final implementation.
- Managed identity and Key Vault references should remain inside Azure/JM1-owned runtime to avoid requiring end-user credentials.
- If a custom connector is selected, document connector ownership, connection references, DLP policy, and export behavior before activation.

## Operational Ownership

| Responsibility | Owner |
|---|---|
| Production approval | Jackie |
| Secure boundary implementation | Engineering/Cody under governed PR |
| Key Vault secret custody | JM1 Azure administrator |
| Power Automate flow ownership | Jackie/JM1 operations |
| UAT validation | Jackie with independent review |
| Evidence retention | JM1 governance repository and SharePoint evidence authority |
