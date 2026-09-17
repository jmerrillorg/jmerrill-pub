import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, ...value] = arg.replace(/^--/, "").split("=");
  return [key, value.join("=") || "true"];
}));
const environmentUrl = args.environment;
const solutionName = args.solution ?? "JMP_PublishingV2_Phase6_Portable";
const parentSolution = args.parent ?? "JMP_PublishingV2";
const version = args.version ?? "1.1.0.0";
const enabled = args.enabled === "true";
const dll = path.resolve(import.meta.dirname, "..", "plugin", "bin", "Release", "net462", "jmpv2phase6onboarding.dll");
const output = path.resolve(import.meta.dirname, "..", "evidence", "dev-registration.json");

if (!environmentUrl) throw new Error("--environment is required");

const token = execFileSync("az", ["account", "get-access-token", "--resource", environmentUrl, "--query", "accessToken", "-o", "tsv"], { encoding: "utf8" }).trim();
const base = `${environmentUrl.replace(/\/$/, "")}/api/data/v9.2`;
const operations = [];

async function request(route, options = {}) {
  const response = await fetch(`${base}/${route}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "OData-Version": "4.0",
      "OData-MaxVersion": "4.0",
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${options.method ?? "GET"} ${route} ${response.status}: ${text.slice(0, 1200)}`);
  return body;
}

async function addComponent(componentId, componentType, includeSubcomponents = false) {
  try {
    const body = {
      ComponentId: componentId,
      ComponentType: componentType,
      SolutionUniqueName: solutionName,
      AddRequiredComponents: false,
      IncludedComponentSettingsValues: null,
    };
    if (componentType === 1) body.DoNotIncludeSubcomponents = !includeSubcomponents;
    await request("AddSolutionComponent", {
      method: "POST",
      body: JSON.stringify(body),
    });
    operations.push(`component_added:${componentType}:${componentId}`);
  } catch (error) {
    if (!String(error.message).includes("already exists")) throw error;
    operations.push(`component_reused:${componentType}:${componentId}`);
  }
}

async function main() {
  const who = await request("WhoAmI()");
  const parent = (await request(`solutions?$select=solutionid,_publisherid_value&$filter=uniquename eq '${parentSolution}'`)).value[0];
  if (!parent) throw new Error(`missing parent solution ${parentSolution}`);

  let solution = (await request(`solutions?$select=solutionid,version&$filter=uniquename eq '${solutionName}'`)).value[0];
  if (!solution) {
    solution = await request("solutions", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        uniquename: solutionName,
        friendlyname: "JMP Publishing V2 Phase 6 Portable Command",
        version,
        description: "Portable Phase 6 onboarding command, guard steps, configuration, and author-access authority.",
        "publisherid@odata.bind": `/publishers(${parent._publisherid_value})`,
      }),
    });
    operations.push("solution_created");
  } else if (solution.version !== version) {
    await request(`solutions(${solution.solutionid})`, { method: "PATCH", body: JSON.stringify({ version }) });
    operations.push("solution_version_updated");
  }

  let definition = (await request("environmentvariabledefinitions?$select=environmentvariabledefinitionid&$filter=schemaname eq 'jmpv2_Phase6OnboardingCommandEnabled'")).value[0];
  if (!definition) {
    definition = await request("environmentvariabledefinitions", {
      method: "POST",
      headers: { Prefer: "return=representation", "MSCRM.SolutionUniqueName": solutionName },
      body: JSON.stringify({
        schemaname: "jmpv2_Phase6OnboardingCommandEnabled",
        displayname: "JMP V2 Phase 6 Onboarding Command Enabled",
        description: "Fail-closed environment gate for the portable Phase 6 onboarding command.",
        type: 100000000,
        defaultvalue: "false",
      }),
    });
    operations.push("environment_variable_created");
  }
  const values = (await request(`environmentvariablevalues?$select=environmentvariablevalueid,value&$filter=_environmentvariabledefinitionid_value eq ${definition.environmentvariabledefinitionid}`)).value;
  if (values[0]) {
    await request(`environmentvariablevalues(${values[0].environmentvariablevalueid})`, { method: "PATCH", body: JSON.stringify({ value: String(enabled) }) });
  } else {
    await request("environmentvariablevalues", {
      method: "POST",
      body: JSON.stringify({ value: String(enabled), "EnvironmentVariableDefinitionId@odata.bind": `/environmentvariabledefinitions(${definition.environmentvariabledefinitionid})` }),
    });
  }
  operations.push(`environment_value:${enabled}`);

  const assemblyBody = { content: readFileSync(dll).toString("base64"), version: "1.0.0.0" };
  let assembly = (await request("pluginassemblies?$select=pluginassemblyid&$filter=name eq 'jmpv2phase6onboarding'")).value[0];
  if (!assembly) throw new Error("existing Phase 6 plugin assembly not found in authoring environment");
  await request(`pluginassemblies(${assembly.pluginassemblyid})`, { method: "PATCH", body: JSON.stringify(assemblyBody) });
  operations.push("assembly_updated");

  const api = (await request("customapis?$select=customapiid&$filter=uniquename eq 'jmpv2_ExecuteOnboardingCommand'")).value[0];
  if (!api) throw new Error("existing onboarding Custom API not found in authoring environment");
  const requestParameters = (await request(`customapirequestparameters?$select=customapirequestparameterid&$filter=_customapiid_value eq ${api.customapiid}`)).value;
  const responseProperties = (await request(`customapiresponseproperties?$select=customapiresponsepropertyid&$filter=_customapiid_value eq ${api.customapiid}`)).value;
  if (requestParameters.length !== 26 || responseProperties.length !== 12) {
    throw new Error(`unexpected command contract: ${requestParameters.length} inputs, ${responseProperties.length} outputs`);
  }
  const authorAccess = await request("EntityDefinitions(LogicalName='jmpv2_authoraccess')?$select=MetadataId");
  const onboardingKeyAttribute = await request("EntityDefinitions(LogicalName='jmpv2_onboardingrecord')/Attributes(LogicalName='jmpv2_onboardingkey')?$select=MetadataId");
  const onboardingAuthorityKey = (await request("EntityDefinitions(LogicalName='jmpv2_onboardingrecord')/Keys?$select=MetadataId,SchemaName&$filter=SchemaName eq 'jmpv2_onboardingrecord_authoritykey'")).value[0];
  if (!onboardingAuthorityKey) throw new Error("onboarding authority key is missing from the authoring environment");
  const steps = (await request("sdkmessageprocessingsteps?$select=sdkmessageprocessingstepid&$filter=contains(name,'Phase6')")).value;
  if (steps.length !== 3) throw new Error(`expected 3 Phase 6 guard steps, found ${steps.length}`);

  await addComponent(authorAccess.MetadataId, 1, true);
  await addComponent(onboardingKeyAttribute.MetadataId, 2, false);
  await addComponent(onboardingAuthorityKey.MetadataId, 14, false);
  await addComponent(assembly.pluginassemblyid, 91, true);
  await addComponent(api.customapiid, 10036, false);
  for (const parameter of requestParameters) await addComponent(parameter.customapirequestparameterid, 10037, false);
  for (const property of responseProperties) await addComponent(property.customapiresponsepropertyid, 10038, false);
  await addComponent(definition.environmentvariabledefinitionid, 380, true);
  for (const step of steps) await addComponent(step.sdkmessageprocessingstepid, 92, false);
  await request("PublishAllXml", { method: "POST", body: "{}" });

  const result = {
    status: "PASS",
    environmentUrl,
    organizationId: who.OrganizationId,
    solutionName,
    version,
    enabled,
    componentCount: 47,
    operations,
    completedAt: new Date().toISOString(),
  };
  mkdirSync(path.dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
