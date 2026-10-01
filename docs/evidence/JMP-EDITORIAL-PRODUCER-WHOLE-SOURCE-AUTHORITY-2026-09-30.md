# Whole controlling manuscript source readback

Packet: `JMP-PIPELINE-SYSTEMIC-COMMISSIONING-001-EDITORIAL-PRODUCER-REBUILD-01-CONTINUE-03`

This is source reconciliation evidence, not approval of a corrected editorial
package or author delivery.

| Source | SHA-256 | Size | Authority |
| --- | --- | ---: | --- |
| August 21 founder-supplied Outlook attachment | `9d8bed1557d81c253115661c0fc0364e53dc041d2eabff9113e0f963976c5683` | 86,076 bytes | Intake evidence recorded in `JMP-INT-202608-JFLY01 - source-artifact-manifest.json` |
| Current canonical Pipeline A-Z original DOCX | `bcb37697484097cf6d11c3b4c30cf6b8590e55b8174428933daf8dd5297b2460` | 95,385 bytes | Dataverse editorial artifact `7372744e-85a3-f111-b8de-6045bdd69678`, `iscurrentapproved=true`, version `v1.0-founder-supplied-recovery` |

The live Dataverse artifact points to SharePoint drive item
`01DF3SEQMJ6W5BTESKQRAJUI34OAUL7GOQ`. Its only Graph file version is
`1.0`, dated August 29, 2026 at 08:36:04 UTC. The canonical Pipeline A-Z
file, the preserved Pre-Pipeline copy, and the September 21 editorial
execution's source checksum all match the second SHA-256 above.

The two DOCX packages are not byte-identical, but their
`word/document.xml` parts are byte-identical (SHA-256
`680dd5251640f25911d0369a111056dabb284d3c57e5c9ba63683c6cf1760499`).
Independent plain-text extraction also matches (SHA-256
`6630debd7e968cb1011089a4fc9f23d8947127108ba44c16bff95d51de00bfe7`).
Each contains eight Word tables. The shared Word document parts other than
package relationships and core properties match; the later package adds
custom XML and package metadata. No manuscript-body or table change was
found between the intake attachment and the current approved source.

**Disposition:** the intake checksum is historical custody evidence for the
email attachment, not the byte checksum of the currently approved SharePoint
artifact. The controlling manuscript for a new execution is the approved
Dataverse/SharePoint item at checksum `bcb376...7b2460`, verified against the
actual downloaded bytes at execution time. The package-level transformation
between August 21 and August 29 is not itself documented as an editorial
decision, so this proof does not authorize any textual change beyond the
identical manuscript body.

The older intake manifest is **historical**, not a competing controlling
manuscript. This classification concerns source-text authority only; it does
not certify a later editorial output.

## Author-response authority

Read-only Publishing mailbox inspection found Jackuline's response to
`Developmental Editing Materials - Whole`, sent September 29, 2026 at
7:57 PM ET from her author mailbox. She agreed with the first two readability
edits and directed that the Self Assessment remain a grid, each category be
clearly delineated, and the final sentence in each Core Component dimension
have a checkbox. These are bounded revision instructions, **not** final
approval of the current Developmental artifact. The live approval gate
`4d04daa2-67b5-f111-aaac-000d3a14673b` still has no author decision; no
stage transition is authorized by this readback.

The upstream Editorial Review stage and current Developmental stage both have
empty governing-style-guide and style-sheet fields. The current author profile
does not expose a voice-profile field. The August 20 canon sync says
Developmental Editing inherits the upstream Editorial Review style-guide
determination, while the governing style matrix defaults trade nonfiction to
CMoS. That default is a source for a minimum project style-sheet candidate,
not evidence that a title-specific style sheet was previously approved.

No source file, Dataverse record, SharePoint item, author communication, or
production state was changed by this readback. Style-guide, voice-profile,
author-decision runtime binding, specialized-agent assignment, shadow output,
and visual QA remain separate open gates.

## Specialized runtime readback

The Foundry project `ais-jm1-foundry/jm1-editorial-foundry` had no agents on
readback. A dedicated no-tools prompt agent, `jm1-agent-pub-editorial-01`, was
created as version `1` against the existing `jm1-editorial-devline-primary`
deployment. Foundry returned agent GUID
`50ba5d40-65f8-47ec-a1e0-dc67ae076244da` and a distinct managed agent
identity. A synthetic, no-business-data request completed through the
agent-scoped Responses endpoint and identified version `1`. The definition is
tracked in `azure-functions/diagnostic-ai-runner/config/editorial-agent-definition.json`;
the shadow-only adapter now checks the returned agent name and version before
accepting a plan. It has no fallback to the generic provider router.

This proves a live specialized agent endpoint, **not** production editorial
assignment. The normal Developmental executor still calls the generic model
router. PR #906 now contains an exact-ID authority resolver contract that
requires current approved source records, verifies manuscript bytes, checks
each authority source's scope and checksum, and runs before the shadow agent.
That contract has synthetic positive and denial tests. It does **not** yet
have the production Dataverse/SharePoint repository adapter, current approved
Whole style guide and voice profile, or a durable snapshot adapter. A governed
end-to-end invocation remains necessary before output or visual QA can be
claimed. Protected
deployment run `36660765615` remains waiting; no Whole run or author send was
performed by this packet.

## October 1 readback for Continue-09

The current Whole Developmental stage has exactly one review-ready record for
each existing project style sheet, voice profile, and author revision rulings.
The registered SharePoint bytes were independently retrieved and SHA-256
checked against Dataverse:

| Authority | Dataverse artifact | Verified SHA-256 |
| --- | --- | --- |
| Project style sheet | `5fa8b46c-f0bc-f111-aaaf-6045bdd69678` | `d96ff43e938ad3afbc0d34b1c5a05401cb095c8288857d2c5b9a0f68ca5a9a3e` |
| Voice profile | `982b8096-f0bc-f111-aaaf-000d3a14673b` | `6ca27ef0417597dc85345e014346bf7147ced049bfbc00548bd388aedcefbd02` |
| Author revision rulings | `988442aa-f0bc-f111-aaaf-6045bdd69678` | `977b4aa090d6dabc751b92b31b50a6e6dda0bb0bfdf84dc69a536590090376e2` |

All three remain `REVIEW_READY`, not author-release-approved. The registered
knowledge Blob URL and expected checksum are present in production Function
configuration, but the local operator identity lacks Blob Data Reader access;
this pass did not verify its live bytes. Production Function managed-identity
readback remains required. Protected deployment run `36798326226` is still
waiting for approval at source SHA `9f65e130897793ca4b4a395531f1f0773b40b670`.

The editorial branch's 23 focused authority, shadow, agent, Word-native, and
evidence-store tests pass. No system-path Whole shadow run, author delivery,
stage advancement, or approval-state mutation occurred in this readback.
The full diagnostic Function suite also passed: 2,622 tests, 458 suites,
zero failures.
