#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const execute = process.argv.includes("--execute");
const resource = (process.env.DATAVERSE_ENVIRONMENT_URL || "https://jm1hq.crm.dynamics.com").replace(/\/$/, "");
const api = `${resource}/api/data/v9.2`;
const token = execFileSync("az", ["account", "get-access-token", "--resource", resource, "--query", "accessToken", "-o", "tsv"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
const actions = [];
const headers = { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json", "OData-MaxVersion": "4.0", "OData-Version": "4.0" };
const label = (value) => ({ LocalizedLabels: [{ Label: value, LanguageCode: 1033 }], UserLocalizedLabel: { Label: value, LanguageCode: 1033 } });
const required = (Value = "None") => ({ Value, CanBeChanged: true, ManagedPropertyLogicalName: "canmodifyrequirementlevelsettings" });

async function request(endpoint, options = {}) {
  const response = await fetch(`${api}${endpoint}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  const text = await response.text();
  if (!response.ok) throw new Error(`${options.method || "GET"} ${endpoint}: ${response.status} ${text.slice(0, 800)}`);
  return text ? JSON.parse(text) : null;
}
async function optional(endpoint) { try { return await request(endpoint); } catch (error) { if (String(error.message).includes(": 404 ")) return null; throw error; } }
async function waitFor(endpoint) { for (let i = 0; i < 40; i += 1) { const found = await optional(endpoint); if (found) return found; await new Promise((resolvePromise) => setTimeout(resolvePromise, 3000)); } throw new Error(`Metadata timeout: ${endpoint}`); }

const entityName = "jm1pub_productionasset";
let entity = await optional(`/EntityDefinitions(LogicalName='${entityName}')?$select=MetadataId,LogicalName,EntitySetName`);
if (!entity) {
  actions.push({ type: "table", name: entityName, action: execute ? "CREATE" : "WOULD_CREATE" });
  if (execute) {
    await request("/EntityDefinitions", { method: "POST", body: JSON.stringify({
      "@odata.type": "Microsoft.Dynamics.CRM.EntityMetadata", SchemaName: "jm1pub_ProductionAsset",
      DisplayName: label("Production Asset"), DisplayCollectionName: label("Production Assets"),
      Description: label("SharePoint-backed file-level production asset registry."), OwnershipType: "OrganizationOwned", IsActivity: false, HasActivities: false, HasNotes: false,
      Attributes: [{ "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata", SchemaName: "jm1pub_Name", DisplayName: label("Name"), RequiredLevel: required("ApplicationRequired"), MaxLength: 300, FormatName: { Value: "Text" }, IsPrimaryName: true }],
    }) });
    entity = await waitFor(`/EntityDefinitions(LogicalName='${entityName}')?$select=MetadataId,LogicalName,EntitySetName`);
  }
} else actions.push({ type: "table", name: entityName, action: "NO_OP" });

const fields = [
  ["jm1pub_StableKey", "Stable Key", 850], ["jm1pub_DriveId", "SharePoint Drive ID", 300], ["jm1pub_ItemId", "SharePoint Item ID", 300],
  ["jm1pub_FileName", "File Name", 500], ["jm1pub_MimeType", "MIME Type", 200], ["jm1pub_AssetType", "Asset Type", 100],
  ["jm1pub_AssetState", "Asset State", 100], ["jm1pub_CanonicalAuthorId", "Canonical Author ID", 100],
  ["jm1pub_CanonicalWorkId", "Canonical Work ID", 100], ["jm1pub_CanonicalProductId", "Canonical Product ID", 100],
  ["jm1pub_MatchBasis", "Match Basis", 100], ["jm1pub_SHA256", "SHA-256", 100],
].map(([SchemaName, display, MaxLength]) => ({ logical: SchemaName.toLowerCase(), metadata: { "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata", SchemaName, DisplayName: label(display), RequiredLevel: required(), MaxLength, FormatName: { Value: "Text" } } }));
fields.push(
  { logical: "jm1pub_weburl", metadata: { "@odata.type": "Microsoft.Dynamics.CRM.MemoAttributeMetadata", SchemaName: "jm1pub_WebUrl", DisplayName: label("Web URL"), RequiredLevel: required(), MaxLength: 4000, FormatName: { Value: "TextArea" } } },
  { logical: "jm1pub_relativepath", metadata: { "@odata.type": "Microsoft.Dynamics.CRM.MemoAttributeMetadata", SchemaName: "jm1pub_RelativePath", DisplayName: label("Relative Path"), RequiredLevel: required(), MaxLength: 4000, FormatName: { Value: "TextArea" } } },
  { logical: "jm1pub_size", metadata: { "@odata.type": "Microsoft.Dynamics.CRM.BigIntAttributeMetadata", SchemaName: "jm1pub_Size", DisplayName: label("Size Bytes"), RequiredLevel: required(), MinValue: 0, MaxValue: Number.MAX_SAFE_INTEGER } },
  { logical: "jm1pub_lastmodified", metadata: { "@odata.type": "Microsoft.Dynamics.CRM.DateTimeAttributeMetadata", SchemaName: "jm1pub_LastModified", DisplayName: label("SharePoint Last Modified"), RequiredLevel: required(), Format: "DateAndTime", DateTimeBehavior: { Value: "TimeZoneIndependent" } } },
);

for (const field of fields) {
  const endpoint = `/EntityDefinitions(LogicalName='${entityName}')/Attributes(LogicalName='${field.logical}')?$select=MetadataId,LogicalName`;
  const existing = entity ? await optional(endpoint) : null;
  actions.push({ type: "field", name: field.logical, action: existing ? "NO_OP" : execute ? "CREATE" : "WOULD_CREATE" });
  if (!existing && execute) {
    await request(`/EntityDefinitions(LogicalName='${entityName}')/Attributes`, { method: "POST", body: JSON.stringify(field.metadata) });
    await waitFor(endpoint);
  }
}

const output = resolve("JMP-Full-Catalog-Production-Asset-Reconciliation-v1/evidence/dataverse/schema-deployment.json");
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify({ generatedAt: new Date().toISOString(), mode: execute ? "EXECUTE" : "DRY_RUN", environment: resource, entitySetName: entity?.EntitySetName ?? null, actions, destructiveChanges: 0 }, null, 2)}\n`);
console.log(JSON.stringify({ mode: execute ? "EXECUTE" : "DRY_RUN", table: entityName, entitySetName: entity?.EntitySetName ?? null, creates: actions.filter((action) => action.action === "CREATE").length, noOps: actions.filter((action) => action.action === "NO_OP").length, evidence: output }, null, 2));
