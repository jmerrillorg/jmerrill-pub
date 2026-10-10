# Fresh Title Runtime Role - isolated candidate

Status: REVIEW_CANDIDATE_NOT_AUTHORIZED_FOR_IMPORT. This is not a silent replacement for Phase 6 package 1.2.0.2 or its approved pin. Existing importer workflows and production settings are unchanged.

Candidate solution: JMP_FreshTitleRuntimeRole 1.0.0.0, managed. Publisher: existing JMPPublishingV2, prefix jmpv2, option prefix 79100. The only root component is role a3fc4c02-7d09-4ca1-8e32-2090ad209dc2. It preserves the seven Basic role privileges and exact role XML bytes from the original governed source. No tables, plugins, steps, existing Phase 6 role, environment variables, flows, identity or scheduler are included.

Artifact: artifacts/JMP_FreshTitleRuntimeRole_1_0_0_0_managed_candidate.zip

SHA256: 1bc8f785288345c6f3d7b3289c51971aa6e5c3c812c270edd42d31c011686a19

Built with supported PAC solution pack 1.49.4, Managed mode. Archive has exactly customizations.xml, solution.xml and [Content_Types].xml. ZIP packing succeeds; native import acceptance has NOT been tested. ZIP re-packing can change timestamps/hash; independently review and pin the resulting exact bytes, never silently refresh this hash.

## Dependency closure

Authoring org 579864ae-44cc-f011-95c7-000d3a37fe06 read-only native RetrieveRequiredComponents(ObjectId=<role>,ComponentType=20) returned HTTP200 with zero dependencies, request 9671b1a8-ae6e-4ebc-8bd8-162ecec15087. Existing role is unmanaged and unassigned. It belongs to Default and the existing unmanaged Phase 6 source solution, not another managed source. No source solution membership was added, removed or changed to prepare this local package.

Production read-only prerequisites on October 10, 2026: all seven privilege names exist and support Basic; four exact managed tables exist (LifecycleInstance, PublishingEngagement, StageDefinition, StageInstance); candidate solution is absent, fresh role returns404, existing Phase6 remains managed1.2.0.1. This supports a role-only candidate referencing already-installed V2 privileges rather than shipping tables. It is not proof of import authorization or import-time dependency resolution.

## Ownership and adoption boundary

Preserve the same role GUID and publisher. Since the target role is absent, this candidate would introduce it; no existing production managed role is transferred between solutions. Existing Phase6 role 2f957237-1ab4-f111-aaac-70a8a59b112b is not in the candidate and must retain exact 45 privilege-ID/depth pairs and assignments.

Original 1.2.0.2 package contains the same new role and remains immutable evidence at hash14fc42c5b9af6f785f458704ce53d57240d99b82932568b8d676affa71219a97. It must NOT subsequently be installed with this role-only candidate as a competing managed owner. Before adoption, record a reviewed supersession: the dedicated solution becomes sole deployment owner of this new role; future Phase6 source/version excludes it through a separately reviewed change, without editing historical packages or uninstalling/removing the currently installed Phase6 solution. This candidate is a local derived proposal, not a second live unmanaged solution. If target ownership has changed since the readback, stop and reconcile; never overwrite or transfer a managed role by inference.

Microsoft guidance: use one publisher, avoid the same unmanaged component in competing solutions, and account for custom role/table dependencies. See https://learn.microsoft.com/en-us/power-platform/alm/organize-solutions and https://learn.microsoft.com/en-us/power-platform/alm/solution-concepts-alm.

## Bounded execution proposal - not executed

1. Review exact source SHA/candidate hash and explicitly authorize this different artifact/sole-owner disposition. Preserve original package pin; do not dispatch the current full-package workflow with a substituted ZIP.
2. Existing platform owner establishes temporary Local CreateRole plus approved Local WriteRole for existing importer, with exact BU exposure, preimages and cleanup. No plugin Global Create/Write, admin substitute, broad access, Assign/Delete escalation or trial privilege expansion. Local pair remains a bounded acceptance proposal, not proven sufficient for RemovePrivilegeRole or importer reads.
3. Future separately reviewed protected candidate workflow must verify org, importer, package/hash, one-role identity, role/solution absence, all seven target privileges, existing V2 prerequisites, import exclusion and Phase6 parity before acquiring a mutation opportunity.
4. One controlled sandbox acceptance after exact Create scope approval: import this actual role-only package with the existing native importer, record terminal import evidence, inspect automatic defaults, normalize only the four already-approved known defaults while role remains unassigned. Unexpected privileges or missing action/read authority stop. Do not add rights to discover another denial.
5. Only after acceptance and recorded production authority perform one protected production import. Independently prove candidate version, same role GUID/name/root BU, zero assignments and exactly seven Basic rights. Independently prove existing Phase6 version/45 privilege pairs/assignments unchanged. No runtime identity assignment or worker enablement is included.
6. Cleanup owner removes temporary grant assignment first and proves effective Create/Write removed, then retires its own temporary role. Retain audit, failed partial states and originals. Timeout means native readback before retry. Do not uninstall Phase6; do not blindly uninstall the candidate or remove a role that became assigned/dependent. Keep dispatch disabled and recover forward under the reviewed owner plan.

Maximum privilege window60minutes except safely waiting for an already-running import's terminal result. Creation exposure is BU-wide, not a role-ID ACL. Existing role-write approval does not itself approve CreateRole. This candidate eliminates unrelated payload components, not the need for supported role operations.

## Validation

```sh
pac solution pack --folder powerplatform/solutions/JMPFreshTitleRuntimeRole/src --zipfile /private/tmp/JMP_FreshTitleRuntimeRole_candidate.zip --packagetype Managed
CANDIDATE_ZIP=/private/tmp/JMP_FreshTitleRuntimeRole_candidate.zip node --test powerplatform/solutions/JMPFreshTitleRuntimeRole/test/package.test.mjs
```

Six source/package tests check exact GUID, publisher/role-byte parity, one role root, seven Basic rights, no plugin/table payload, and rejection of injected roots/privileges/GUID drift. Read-only candidate PR workflow verifies immutable original/candidate hashes and actual archive. No deployment or id-token permission is present.
