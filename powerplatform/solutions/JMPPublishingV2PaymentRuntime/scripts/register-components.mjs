import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, ...value] = arg.replace(/^--/, "").split("=");
  return [key, value.join("=") || "true"];
}));
const environmentUrl = args.environment?.replace(/\/$/, "");
const expectedOrganizationId = args["expected-organization-id"]?.toLowerCase();
const root = path.resolve(import.meta.dirname, "..");
const manifest = JSON.parse(readFileSync(path.join(root, "payment-ledger-schema.json"), "utf8"));
const evidencePath = path.join(root, "evidence", "authoring-registration.json");
const az = process.env.JM1_AZ_CLI || "az";

if (!environmentUrl) throw new Error("--environment is required");

const token = execFileSync(az, ["account", "get-access-token", "--resource", environmentUrl, "--query", "accessToken", "-o", "tsv"], { encoding: "utf8" }).trim();
const base = `${environmentUrl}/api/data/v9.2`;
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
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${options.method || "GET"} ${route} ${response.status}: ${text.slice(0, 1200)}`);
  return text ? JSON.parse(text) : null;
}

async function addComponent(componentId, componentType, includeSubcomponents = false) {
  try {
    await request("AddSolutionComponent", {
      method: "POST",
      body: JSON.stringify({
        ComponentId: componentId,
        ComponentType: componentType,
        SolutionUniqueName: manifest.solution.uniqueName,
        AddRequiredComponents: false,
        IncludedComponentSettingsValues: null,
        ...(componentType === 1 ? { DoNotIncludeSubcomponents: !includeSubcomponents } : {}),
      }),
    });
    operations.push(`component_added:${componentType}:${componentId}`);
  } catch (error) {
    if (!String(error.message).includes("already exists")) throw error;
    operations.push(`component_reused:${componentType}:${componentId}`);
  }
}

function label(text) {
  return { LocalizedLabels: [{ Label: text, LanguageCode: 1033 }] };
}

function displayName(logicalName) {
  return logicalName.replace(/^jmpv2_/, "").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ").replace(/\b\w/g, (value) => value.toUpperCase());
}

function attributeBody([logicalName, type, size]) {
  const common = {
    SchemaName: logicalName,
    DisplayName: label(displayName(logicalName)),
    Description: label(`JMP Publishing payment runtime ${displayName(logicalName)}.`),
    RequiredLevel: { Value: "None", CanBeChanged: true, ManagedPropertyLogicalName: "canmodifyrequirementlevelsettings" },
    IsAuditEnabled: { Value: true, CanBeChanged: true, ManagedPropertyLogicalName: "canmodifyauditsettings" },
  };
  if (type === "String") return { "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata", ...common, MaxLength: size, FormatName: { Value: "Text" } };
  if (type === "Memo") return { "@odata.type": "Microsoft.Dynamics.CRM.MemoAttributeMetadata", ...common, MaxLength: size, Format: "TextArea" };
  if (type === "BigInt") return { "@odata.type": "Microsoft.Dynamics.CRM.BigIntAttributeMetadata", ...common };
  if (type === "Integer") return { "@odata.type": "Microsoft.Dynamics.CRM.IntegerAttributeMetadata", ...common, MinValue: 0, MaxValue: 10000, Format: "None" };
  if (type === "DateTime") return { "@odata.type": "Microsoft.Dynamics.CRM.DateTimeAttributeMetadata", ...common, Format: "DateAndTime", DateTimeBehavior: { Value: "UserLocal" } };
  throw new Error(`unsupported attribute type ${type}`);
}

async function ensureAttribute(table, definition) {
  const logicalName = definition[0];
  let attribute;
  try {
    attribute = await request(`EntityDefinitions(LogicalName='${table}')/Attributes(LogicalName='${logicalName}')?$select=MetadataId,LogicalName`);
    operations.push(`attribute_reused:${table}:${logicalName}`);
  } catch (error) {
    if (!String(error.message).includes("404")) throw error;
    await request(`EntityDefinitions(LogicalName='${table}')/Attributes`, {
      method: "POST",
      headers: { "MSCRM.SolutionUniqueName": manifest.solution.uniqueName },
      body: JSON.stringify(attributeBody(definition)),
    });
    for (let attempt = 0; attempt < 12 && !attribute; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      try {
        attribute = await request(`EntityDefinitions(LogicalName='${table}')/Attributes(LogicalName='${logicalName}')?$select=MetadataId,LogicalName`);
      } catch (pollError) {
        if (!String(pollError.message).includes("404")) throw pollError;
      }
    }
    if (!attribute) throw new Error(`attribute did not materialize: ${table}:${logicalName}`);
    operations.push(`attribute_created:${table}:${logicalName}`);
  }
  await addComponent(attribute.MetadataId, 2);
  return attribute;
}

async function ensureEnvironmentVariable(schemaName, display, description, defaultValue) {
  let definition = (await request(`environmentvariabledefinitions?$select=environmentvariabledefinitionid&$filter=schemaname eq '${schemaName}'`)).value[0];
  if (!definition) {
    definition = await request("environmentvariabledefinitions", {
      method: "POST",
      headers: { Prefer: "return=representation", "MSCRM.SolutionUniqueName": manifest.solution.uniqueName },
      body: JSON.stringify({ schemaname: schemaName, displayname: display, description, type: 100000000, defaultvalue: defaultValue }),
    });
    operations.push(`environment_variable_created:${schemaName}`);
  } else {
    operations.push(`environment_variable_reused:${schemaName}`);
  }
  await addComponent(definition.environmentvariabledefinitionid, 380, true);
  return definition;
}

async function ensureAlternateKey([table, schemaName, attributes]) {
  let key = (await request(`EntityDefinitions(LogicalName='${table}')/Keys?$select=MetadataId,SchemaName&$filter=SchemaName eq '${schemaName}'`)).value[0];
  if (!key) {
    await request(`EntityDefinitions(LogicalName='${table}')/Keys`, {
      method: "POST",
      headers: { "MSCRM.SolutionUniqueName": manifest.solution.uniqueName },
      body: JSON.stringify({ SchemaName: schemaName, DisplayName: label(displayName(schemaName)), KeyAttributes: attributes }),
    });
    for (let attempt = 0; attempt < 12 && !key; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      key = (await request(`EntityDefinitions(LogicalName='${table}')/Keys?$select=MetadataId,SchemaName,EntityKeyIndexStatus&$filter=SchemaName eq '${schemaName}'`)).value[0];
    }
    if (!key) throw new Error(`alternate key did not materialize: ${schemaName}`);
    operations.push(`key_created:${table}:${schemaName}`);
  } else {
    operations.push(`key_reused:${table}:${schemaName}`);
  }
  await addComponent(key.MetadataId, 14);
}

async function ensureRuntimeRole(businessUnitId) {
  const roleName = manifest.runtimeRole.name;
  let role = (await request(`roles?$select=roleid,name&$filter=name eq '${roleName}' and _businessunitid_value eq ${businessUnitId}`)).value[0];
  if (!role) {
    role = await request("roles", {
      method: "POST",
      headers: { Prefer: "return=representation", "MSCRM.SolutionUniqueName": manifest.solution.uniqueName },
      body: JSON.stringify({ name: roleName, "businessunitid@odata.bind": `/businessunits(${businessUnitId})` }),
    });
    operations.push("runtime_role_created");
  } else {
    operations.push("runtime_role_reused");
  }
  const names = [...manifest.runtimeRole.global, ...manifest.runtimeRole.platformRequiredGlobal];
  const filter = names.map((name) => `name eq '${name}'`).join(" or ");
  const privileges = (await request(`privileges?$select=privilegeid,name&$filter=${encodeURIComponent(filter)}`)).value;
  const found = new Map(privileges.map((privilege) => [privilege.name, privilege]));
  const missing = names.filter((name) => !found.has(name));
  if (missing.length) throw new Error(`runtime privileges missing: ${missing.join(",")}`);
  await request(`roles(${role.roleid})/Microsoft.Dynamics.CRM.ReplacePrivilegesRole`, {
    method: "POST",
    body: JSON.stringify({
      Privileges: names.map((name) => ({
        Depth: "Global",
        PrivilegeId: found.get(name).privilegeid,
        BusinessUnitId: businessUnitId,
        PrivilegeName: name,
      })),
    }),
  });
  operations.push(`runtime_role_privileges_replaced:${manifest.runtimeRole.global.length}_runtime:${manifest.runtimeRole.platformRequiredGlobal.length}_platform_required`);
  await addComponent(role.roleid, 20);
  return role;
}

async function ensurePublisher() {
  const uniqueName = manifest.solution.publisherUniqueName;
  let publisher = (await request(`publishers?$select=publisherid,uniquename,customizationprefix,isreadonly&$filter=uniquename eq '${uniqueName}'`)).value[0];
  if (!publisher) {
    publisher = await request("publishers", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        uniquename: uniqueName,
        friendlyname: manifest.solution.publisherFriendlyName,
        customizationprefix: manifest.solution.publisherPrefix,
        customizationoptionvalueprefix: manifest.solution.publisherOptionValuePrefix,
      }),
    });
    operations.push("publisher_created");
  } else {
    operations.push("publisher_reused");
  }
  if (publisher.isreadonly) throw new Error(`payment runtime publisher is read-only: ${uniqueName}`);
  if (publisher.customizationprefix !== manifest.solution.publisherPrefix) {
    throw new Error(`payment runtime publisher prefix mismatch: ${publisher.customizationprefix}`);
  }
  return publisher;
}

async function main() {
  const who = await request("WhoAmI()");
  if (expectedOrganizationId && who.OrganizationId.toLowerCase() !== expectedOrganizationId) {
    throw new Error(`environment guard failed: expected ${expectedOrganizationId}, got ${who.OrganizationId}`);
  }
  const parent = (await request(`solutions?$select=solutionid,_publisherid_value&$filter=uniquename eq '${manifest.solution.parentSolution}'`)).value[0];
  if (!parent) throw new Error(`missing parent solution ${manifest.solution.parentSolution}`);
  const publisher = await ensurePublisher();
  let solution = (await request(`solutions?$select=solutionid,version&$filter=uniquename eq '${manifest.solution.uniqueName}'`)).value[0];
  if (!solution) {
    solution = await request("solutions", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        uniquename: manifest.solution.uniqueName,
        friendlyname: manifest.solution.friendlyName,
        version: manifest.solution.version,
        description: "Portable extension of canonical Publishing V2 tables for the durable payment ledger. Disabled by default.",
        "publisherid@odata.bind": `/publishers(${publisher.publisherid})`,
      }),
    });
    operations.push("solution_created");
  }

  for (const [table, attributes] of Object.entries(manifest.tables)) {
    const entity = await request(`EntityDefinitions(LogicalName='${table}')?$select=MetadataId,IsCustomizable`);
    if (!entity.IsCustomizable?.Value) throw new Error(`canonical table is not customizable: ${table}`);
    await addComponent(entity.MetadataId, 1, false);
    for (const attribute of attributes) await ensureAttribute(table, attribute);
  }

  await request("PublishAllXml", { method: "POST", body: "{}" });
  for (const key of manifest.alternateKeys) await ensureAlternateKey(key);
  await ensureEnvironmentVariable("jmpv2_PaymentRuntimeEnabled", "JMP V2 Payment Runtime Enabled", "Fail-closed gate for Publishing payment ledger mutation and collection.", "false");
  await ensureEnvironmentVariable("jmpv2_PaymentTimerMode", "JMP V2 Payment Timer Mode", "DISABLED, DRY_RUN, or ENABLED. Managed default is DISABLED.", "DISABLED");
  const role = await ensureRuntimeRole(who.BusinessUnitId);
  await request("PublishAllXml", { method: "POST", body: "{}" });

  const result = {
    status: "PASS",
    environmentUrl,
    organizationId: who.OrganizationId,
    solutionName: manifest.solution.uniqueName,
    version: manifest.solution.version,
    runtimeRoleId: role.roleid,
    runtimeEnabledDefault: false,
    timerModeDefault: "DISABLED",
    tableCount: Object.keys(manifest.tables).length,
    attributeCount: Object.values(manifest.tables).flat().length,
    operations,
    completedAt: new Date().toISOString(),
  };
  mkdirSync(path.dirname(evidencePath), { recursive: true });
  writeFileSync(evidencePath, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
