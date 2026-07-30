# 02 Limitations

## ANNEXS-LIM-001

- Affected capability: Branch protection, CodeQL, Dependabot, vulnerability alerts, Advanced Security
- Exact blocker: Current GitHub token has repo/read:org/workflow but most security-control endpoints returned not verified; org Advanced Security requires admin/security-manager authority.
- Evidence obtained: 19 repositories enumerated; secret scanning endpoint readable for subset; per-repo endpoint status captured.
- Confidence: LOW
- Owner: Jackie / GitHub Admin
- Safe next action: Validate org and repo security controls with GitHub administrator/security-manager access.
- Impact on Chad synthesis: Treat development-security controls as not proven except where endpoint status is READ_OK.

## ANNEXS-LIM-002

- Affected capability: DLP policies and connector classifications
- Exact blocker: Power Platform admin DLP endpoint did not verify under available tool/auth context.
- Evidence obtained: PAC listed five environments; Dataverse flow and audit metadata readable.
- Confidence: MEDIUM
- Owner: Jackie / Power Platform Admin
- Safe next action: Read DLP policies and connector groupings in Power Platform Admin Center/API.
- Impact on Chad synthesis: Do not infer DLP activation from Dataverse environment inventory.

## ANNEXS-LIM-003

- Affected capability: Sensitivity labels, retention labels, DLP, Secure Score
- Exact blocker: Graph security/compliance endpoints returned forbidden/unauthorized for label and Secure Score readbacks.
- Evidence obtained: Entitlement service plans observed; directory audit sample readable.
- Confidence: LOW
- Owner: Jackie / Compliance or Security Admin
- Safe next action: Validate Purview and Secure Score using Compliance/Security Reader role.
- Impact on Chad synthesis: Classify as entitled or not verified, not activated/proven.

## ANNEXS-LIM-004

- Affected capability: JM1-SUPPORT, JM1-ARCHIVE, JM1-VIEW, JM1-MOBILE
- Exact blocker: No direct endpoint session and Intune managed-device readback unavailable.
- Evidence obtained: JM1-PRIME direct local evidence only; named endpoint limitations captured.
- Confidence: UNKNOWN
- Owner: Jackie / Endpoint Admin
- Safe next action: Use Intune/Defender or direct sessions for each named device.
- Impact on Chad synthesis: Endpoint lane cannot be generalized beyond JM1-PRIME.

## ANNEXS-LIM-005

- Affected capability: PIM eligibility and MFA registration method strength
- Exact blocker: Role eligibility and authentication-method registration reports require premium license/scope or broader directory permission.
- Evidence obtained: Conditional Access policies and standing role assignments were readable.
- Confidence: MEDIUM
- Owner: Jackie / Identity Admin
- Safe next action: Validate PIM and MFA registration posture through Entra admin/API.
- Impact on Chad synthesis: Standing-role posture can be synthesized; PIM/MFA method strength remains not proven.
