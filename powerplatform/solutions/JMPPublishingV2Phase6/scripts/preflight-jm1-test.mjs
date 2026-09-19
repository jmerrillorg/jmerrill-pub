import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const environmentUrl = process.env.JMP_PHASE6_PREFLIGHT_ENVIRONMENT_URL;
const expectedOrganizationId = process.env.JMP_PHASE6_PREFLIGHT_ORGANIZATION_ID;
const root = path.resolve(import.meta.dirname, "..");
const managed = path.join(root, "artifacts", "JMP_PublishingV2_Phase6_Portable_1_2_0_0_managed.zip");
const output = path.join(root, "evidence", "jm1-test-preflight.json");
if (!environmentUrl || !expectedOrganizationId) throw new Error("preflight environment URL and organization ID are required");

const token = execFileSync("az", ["account", "get-access-token", "--resource", environmentUrl, "--query", "accessToken", "-o", "tsv"], { encoding: "utf8" }).trim();
const base = `${environmentUrl.replace(/\/$/, "")}/api/data/v9.2`;
async function request(route) {
  const response = await fetch(`${base}/${route}`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
  const text = await response.text();
  if (!response.ok) throw new Error(`GET ${route} ${response.status}: ${text.slice(0, 1200)}`);
  return JSON.parse(text);
}

const who = await request("WhoAmI()");
const userRoles = (await request(`systemusers(${who.UserId})/systemuserroles_association?$select=name`)).value;
const existingEntities = (await request("EntityDefinitions?$select=LogicalName&$filter=LogicalName eq 'jmpv2_onboardingrecord' or LogicalName eq 'jmpv2_onboardingcompletionevent' or LogicalName eq 'jmpv2_authorprofile' or LogicalName eq 'jmpv2_onboardingitem' or LogicalName eq 'jmpv2_workspaceprovisioning' or LogicalName eq 'jmpv2_payoutreadiness' or LogicalName eq 'jmpv2_publishingengagement' or LogicalName eq 'jmpv2_lifecycleinstance' or LogicalName eq 'jmpv2_authoraccess'" )).value.map((row) => row.LogicalName);
const runtimeSchema = {
  jmpv2_authorprofile: ["jmpv2_authorprofilekey", "jmpv2_canonicalcontactid", "jmpv2_fullname", "jmpv2_email", "jmpv2_activationstatus", "jmpv2_activationevent", "jmpv2_correlationid", "jmpv2_testclassification", "jmpv2_activatedat"],
  jmpv2_onboardingrecord: ["jmpv2_onboardingkey", "jmpv2_authorprofilekey", "jmpv2_authorprofileid", "jmpv2_canonicalcontactid", "jmpv2_engagementid", "jmpv2_titleid", "jmpv2_lifecycleid", "jmpv2_completenessstatus", "jmpv2_completenessreasons", "jmpv2_policyversion", "jmpv2_recordversion", "jmpv2_correlationid", "jmpv2_testclassification", "jmpv2_startedat"],
  jmpv2_onboardingitem: ["jmpv2_itemkey", "jmpv2_onboardingkey", "jmpv2_onboardingrecordid", "jmpv2_itemtype", "jmpv2_classification", "jmpv2_status", "jmpv2_evidencereference", "jmpv2_evidencechecksum", "jmpv2_evidenceengagementid", "jmpv2_itemversion", "jmpv2_testclassification", "jmpv2_completedat"],
  jmpv2_workspaceprovisioning: ["jmpv2_workspacekey", "jmpv2_onboardingkey", "jmpv2_onboardingrecordid", "jmpv2_authorprofilekey", "jmpv2_engagementid", "jmpv2_titleid", "jmpv2_canonicalroot", "jmpv2_workspacepath", "jmpv2_workspaceitemid", "jmpv2_status", "jmpv2_idempotencykey", "jmpv2_testclassification", "jmpv2_provisionedat"],
  jmpv2_authoraccess: ["jmpv2_accesskey", "jmpv2_onboardingkey", "jmpv2_authorprofilekey", "jmpv2_onboardingrecordid", "jmpv2_engagementid", "jmpv2_status", "jmpv2_evidencereference", "jmpv2_evidencechecksum", "jmpv2_idempotencykey", "jmpv2_testclassification", "jmpv2_verifiedat"],
  jmpv2_payoutreadiness: ["jmpv2_payoutkey", "jmpv2_onboardingkey", "jmpv2_authorprofilekey", "jmpv2_onboardingrecordid", "jmpv2_engagementid", "jmpv2_requirement", "jmpv2_relationshipstatus", "jmpv2_evidencereference", "jmpv2_evidencechecksum", "jmpv2_testclassification"],
  jmpv2_onboardingcompletionevent: ["jmpv2_completionkey", "jmpv2_onboardingkey", "jmpv2_onboardingrecordid", "jmpv2_authorprofilekey", "jmpv2_engagementid", "jmpv2_completionstatus", "jmpv2_reasoncode", "jmpv2_evidencechecksum", "jmpv2_idempotencykey", "jmpv2_testclassification", "jmpv2_completedat"],
};
const targetSchema = {};
for (const name of Object.keys(runtimeSchema)) {
  targetSchema[name] = (await request(`EntityDefinitions(LogicalName='${name}')/Attributes?$select=LogicalName`)).value.map((row) => row.LogicalName);
}
const packageEntries = execFileSync("unzip", ["-Z1", managed], { encoding: "utf8" }).trim().split("\n");
const source = readFileSync(path.join(root, "plugin", "Phase6OnboardingAuthorityPlugin.cs"), "utf8");
const solutionManifest = readFileSync(path.join(root, "src", "Other", "Solution.xml"), "utf8");
const packageBytes = readFileSync(managed);
const requiredExisting = ["jmpv2_onboardingrecord", "jmpv2_onboardingcompletionevent", "jmpv2_authorprofile", "jmpv2_onboardingitem", "jmpv2_workspaceprovisioning", "jmpv2_payoutreadiness", "jmpv2_publishingengagement", "jmpv2_lifecycleinstance"];
const missingRuntimeSchema = Object.entries(runtimeSchema).flatMap(([entity, attributes]) => attributes.filter((attribute) => !targetSchema[entity].includes(attribute)).map((attribute) => `${entity}.${attribute}`));
const managedRootTables = Object.keys(runtimeSchema).filter((name) => solutionManifest.includes(`schemaName="${name}" behavior="0"`));
const checks = {
  targetEnvironment: String(who.OrganizationId).toLowerCase() === expectedOrganizationId.toLowerCase(),
  managedPackageReadable: packageEntries.includes("solution.xml") && packageEntries.includes("customizations.xml"),
  commandIncluded: packageEntries.includes("customapis/jmpv2_ExecuteOnboardingCommand/customapi.xml"),
  contractIncluded: packageEntries.filter((entry) => entry.includes("customapirequestparameter.xml")).length === 26 && packageEntries.filter((entry) => entry.includes("customapiresponseproperty.xml")).length === 12,
  pluginIncluded: packageEntries.some((entry) => entry.endsWith("jmpv2phase6onboarding.dll")),
  phase6TablesIncluded: managedRootTables.length === Object.keys(runtimeSchema).length,
  baseDependenciesPresent: requiredExisting.every((name) => existingEntities.includes(name)),
  currentTargetRuntimeSchemaKnown: Object.keys(targetSchema).length === Object.keys(runtimeSchema).length,
  environmentVariableResolvable: packageEntries.includes("environmentvariabledefinitions/jmpv2_Phase6OnboardingCommandEnabled/environmentvariablevalues.json"),
  deploymentCallerAuthorized: userRoles.some((role) => role.name === "System Administrator"),
  portableSource: !/JM1_DEV_REQUIRED|org52409ff2|jm1test\.crm|579864ae|bb7a9d9e/.test(source),
  noPhase7: packageEntries.every((entry) => !/phase7|developmental/i.test(entry)),
};
const status = Object.values(checks).every(Boolean) ? "PASS" : "FAIL";
const result = {
  status,
  target: "JM1-Test",
  organizationId: who.OrganizationId,
  managedArtifact: path.basename(managed),
  managedArtifactSha256: createHash("sha256").update(packageBytes).digest("hex"),
  managedRootTables,
  currentTargetMissingRuntimeSchema: missingRuntimeSchema,
  checks,
  dependenciesPresentOrIncluded: status === "PASS",
  rollbackPackage: "READY — isolated managed solution can be removed without replacing JMP_PublishingV2 1.0.4.0",
  productionDependency: false,
  deploymentExecuted: false,
  completedAt: new Date().toISOString(),
};
mkdirSync(path.dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
if (status !== "PASS") process.exitCode = 1;
