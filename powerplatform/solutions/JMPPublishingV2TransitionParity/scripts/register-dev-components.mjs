import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const environmentUrl = process.env.JMP_TRANSITION_DEV_ENVIRONMENT_URL;
const expectedOrganizationId = process.env.JMP_TRANSITION_DEV_ORGANIZATION_ID;
const solutionName = "JMP_PublishingV2_TransitionParity";
const version = "1.0.0.4";
const root = path.resolve(import.meta.dirname, "..");
const dll = path.join(root, "plugin", "bin", "Release", "net462", "plugin.dll");
const output = path.join(root, "evidence", "dev-registration.json");
if (!environmentUrl || !expectedOrganizationId) throw new Error("Dev environment URL and organization ID are required");

const token = execFileSync("az", ["account", "get-access-token", "--resource", environmentUrl, "--query", "accessToken", "-o", "tsv"], { encoding: "utf8" }).trim();
const base = `${environmentUrl.replace(/\/$/, "")}/api/data/v9.2`;
async function request(route, options = {}) {
  const response = await fetch(`${base}/${route}`, { ...options, headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json", ...(options.headers ?? {}) } });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${options.method ?? "GET"} ${route} ${response.status}: ${text.slice(0, 1200)}`);
  return body;
}
async function addComponent(id, type, includeSubcomponents = false) {
  const existing = (await request(`solutioncomponents?$select=solutioncomponentid&$filter=_solutionid_value eq ${solution.solutionid} and objectid eq ${id} and componenttype eq ${type}`)).value;
  if (existing.length > 0) return;
  try {
    const body = { ComponentId: id, ComponentType: type, SolutionUniqueName: solutionName, AddRequiredComponents: type === 92 };
    if (type === 1) body.DoNotIncludeSubcomponents = !includeSubcomponents;
    await request("AddSolutionComponent", { method: "POST", body: JSON.stringify(body) });
  } catch (error) {
    if (!String(error.message).includes("already exists")) throw error;
  }
}

const who = await request("WhoAmI()");
if (String(who.OrganizationId).toLowerCase() !== expectedOrganizationId.toLowerCase()) throw new Error("WRONG_DEV_ENVIRONMENT");
const parent = (await request("solutions?$select=solutionid,_publisherid_value&$filter=uniquename eq 'JMP_PublishingV2'" )).value[0];
if (!parent) throw new Error("PARENT_SOLUTION_NOT_FOUND");
let solution = (await request(`solutions?$select=solutionid,version&$filter=uniquename eq '${solutionName}'`)).value[0];
if (!solution) {
  solution = await request("solutions", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ uniquename: solutionName, friendlyname: "JMP Publishing V2 Transition Parity", version, description: "Transactional lifecycle, engagement, and replay parity for the governed transition authority.", "publisherid@odata.bind": `/publishers(${parent._publisherid_value})` }) });
} else if (solution.version !== version) {
  await request(`solutions(${solution.solutionid})`, { method: "PATCH", body: JSON.stringify({ version }) });
}

const api = (await request("customapis?$select=customapiid,_plugintypeid_value&$filter=uniquename eq 'jmpv2_RequestTransitionV2'" )).value[0];
if (!api) throw new Error("TRANSITION_API_NOT_FOUND");
const pluginType = await request(`plugintypes(${api._plugintypeid_value})?$select=typename,version,_pluginassemblyid_value`);
if (pluginType.typename !== "plugin.V2RequestTransitionPlugin" || pluginType.version !== "1.0.0.3") throw new Error("TRANSITION_PLUGIN_IDENTITY_MISMATCH");
const assembly = await request(`pluginassemblies(${pluginType._pluginassemblyid_value})?$select=name,version,publickeytoken`);
if (assembly.name !== "plugin" || assembly.version !== "1.0.0.3" || assembly.publickeytoken !== "fffbe8b3d67a6cc0") throw new Error("TRANSITION_ASSEMBLY_IDENTITY_MISMATCH");
const bytes = readFileSync(dll);
await request(`pluginassemblies(${assembly.pluginassemblyid})`, { method: "PATCH", body: JSON.stringify({ content: bytes.toString("base64"), version: "1.0.0.3" }) });

const requests = (await request(`customapirequestparameters?$select=customapirequestparameterid&$filter=_customapiid_value eq ${api.customapiid}`)).value;
const responses = (await request(`customapiresponseproperties?$select=customapiresponsepropertyid&$filter=_customapiid_value eq ${api.customapiid}`)).value;
const steps = (await request(`sdkmessageprocessingsteps?$select=sdkmessageprocessingstepid,name&$filter=_eventhandler_value eq ${api._plugintypeid_value}`)).value;
if (requests.length !== 8 || responses.length !== 5 || steps.length !== 3) throw new Error(`TRANSITION_COMPONENT_CARDINALITY:${requests.length}:${responses.length}:${steps.length}`);
await addComponent(assembly.pluginassemblyid, 91, true);
await addComponent(api.customapiid, 10036);
for (const item of requests) await addComponent(item.customapirequestparameterid, 10037);
for (const item of responses) await addComponent(item.customapiresponsepropertyid, 10038);
await request("PublishAllXml", { method: "POST", body: "{}" });

const result = { status: "PASS", environment: "JM1-Dev", organizationId: who.OrganizationId, solutionName, version, assemblyIdentity: "plugin, Version=1.0.0.3, PublicKeyToken=fffbe8b3d67a6cc0", dllSha256: createHash("sha256").update(bytes).digest("hex"), componentCount: 15, requestParameters: 8, responseProperties: 5, registeredStepsVerified: steps.map((step) => step.name).sort(), completedAt: new Date().toISOString() };
mkdirSync(path.dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
