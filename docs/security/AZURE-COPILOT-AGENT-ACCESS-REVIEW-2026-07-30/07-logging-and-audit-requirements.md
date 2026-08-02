# Logging And Audit Requirements

Before any Azure Copilot agent is approved for JM1 operational use, the following must be documented:

- user identity and Entra role at time of use;
- target subscription, resource group, and resource scope;
- agent family and capability used;
- prompt classification without confidential prompt retention unless separately governed;
- generated artifacts and whether they entered source control, tickets, evidence, or Azure;
- approval action required before Azure changes;
- execution correlation to jm1_executionlog when related to governed programs;
- incident-response path for unexpected agent behavior.

Never retain secrets, tokens, private keys, or confidential prompts in generated evidence.

