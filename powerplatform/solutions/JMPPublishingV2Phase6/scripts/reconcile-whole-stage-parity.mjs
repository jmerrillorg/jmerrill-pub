import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const environmentUrl = process.env.JMP_PHASE6_PARITY_ENVIRONMENT_URL;
const expectedOrganizationId = process.env.JMP_PHASE6_PARITY_ORGANIZATION_ID;
const engagementId = "0038ee51-27a9-f111-aaab-70a8a59b112b";
const lifecycleId = "0238ee51-27a9-f111-aaab-70a8a59b112b";
const lifecycleKey = "legacy-lifecycle-b1ed3978-829b-4f48-a289-4d9257b21a95";
const eventKey = "WHOLE-STAGE-PARITY-REPAIR-20260917-V1";
const output = path.resolve(import.meta.dirname, "..", "evidence", "whole-stage-parity-repair.json");
if (!environmentUrl || !expectedOrganizationId) throw new Error("parity environment URL and organization ID are required");

const token = execFileSync("az", ["account", "get-access-token", "--resource", environmentUrl, "--query", "accessToken", "-o", "tsv"], { encoding: "utf8" }).trim();
const base = `${environmentUrl.replace(/\/$/, "")}/api/data/v9.2`;
async function request(route, options = {}) {
  const response = await fetch(`${base}/${route}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json", ...(options.headers ?? {}) },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${options.method ?? "GET"} ${route} ${response.status}: ${text.slice(0, 1200)}`);
  return body;
}
const rows = async (set, filter) => (await request(`${set}?$filter=${encodeURIComponent(filter)}`)).value ?? [];
function assert(value, code) { if (!value) throw new Error(code); }

const who = await request("WhoAmI()");
assert(String(who.OrganizationId).toLowerCase() === expectedOrganizationId.toLowerCase(), "WRONG_TARGET_ENVIRONMENT");

const [engagement, lifecycle, agreements, executions, payments, requirements, bindings, transitions, priorEvents] = await Promise.all([
  request(`jmpv2_publishingengagements(${engagementId})`),
  request(`jmpv2_lifecycleinstances(${lifecycleId})`),
  rows("jmpv2_agreementrecords", `jmpv2_engagementid eq '${engagementId}' and jmpv2_status eq 'EXECUTED'`),
  rows("jmpv2_agreementexecutions", "jmpv2_agreementkey eq 'WHOLE-STAGE05-FINAL-AGREEMENT-V2-AUTHOR-ADDRESS' and jmpv2_status eq 'EXECUTED'"),
  rows("jmpv2_paymentevidences", `jmpv2_engagementid eq '${engagementId}' and jmpv2_paymentstatus eq 'PAID'`),
  rows("jmpv2_paymentrequirements", `jmpv2_engagementid eq '${engagementId}' and jmpv2_requirementstatus eq 'PAID'`),
  rows("jmpv2_sharepointworkspacebindings", `jmpv2_lifecycleinstanceid eq '${lifecycleId}' and jmpv2_bindingstatus eq 'BOUND'`),
  rows("jmpv2_transitionevents", `jmpv2_lifecyclekey eq '${lifecycleKey}' and jmpv2_tostagecode eq '06_ONBOARDING' and jmpv2_fromstagecode eq '05_AGREEMENT_PAYMENT'`),
  rows("jmpv2_executionevents", `jmpv2_executionkey eq '${eventKey}'`),
]);

assert(engagement.jmpv2_canonicalauthorname === "Jackuline Fly", "AUTHOR_IDENTITY_FAILED");
assert(engagement.jmpv2_canonicaltitlename === "Whole", "TITLE_IDENTITY_FAILED");
assert(engagement.jmpv2_package === "Starter Publishing Package" && Number(engagement.jmpv2_packageprice) === 1999, "STARTER_PACKAGE_FAILED");
assert(lifecycle.jmpv2_currentstagecode === "06_ONBOARDING" && lifecycle.jmpv2_isactive === true, "LIFECYCLE_STAGE_FAILED");
assert(agreements.length === 1 && executions.length === 1, "EXECUTED_AGREEMENT_FAILED");
assert(payments.length === 1 && Number(payments[0].jmpv2_amountreceived) === 1999, "PAYMENT_EVIDENCE_FAILED");
assert(requirements.length === 1 && Number(requirements[0].jmpv2_amountdue) === 1999, "PAYMENT_REQUIREMENT_FAILED");
assert(bindings.length === 1 && bindings[0].jmpv2_workspacepath === "01_Pipeline_A-Z/06 - Onboarding/Fly, Jackuline - Whole", "WORKSPACE_BINDING_FAILED");
assert(transitions.length === 1 && transitions[0].jmpv2_lifecyclekey === lifecycle.jmpv2_lifecyclekey, "TRANSITION_AUTHORITY_FAILED");
assert(priorEvents.length <= 1, "DUPLICATE_PARITY_EVENT");

let repaired = false;
if (engagement.jmpv2_currentstage === "05_AGREEMENT_PAYMENT") {
  await request(`jmpv2_publishingengagements(${engagementId})`, { method: "PATCH", body: JSON.stringify({ jmpv2_currentstage: "06_ONBOARDING" }) });
  repaired = true;
} else {
  assert(engagement.jmpv2_currentstage === "06_ONBOARDING", "UNEXPECTED_ENGAGEMENT_STAGE");
}

if (priorEvents.length === 0) {
  await request("jmpv2_executionevents", {
    method: "POST",
    body: JSON.stringify({
      jmpv2_executionkey: eventKey,
      jmpv2_eventtype: "STAGE_PARITY_REPAIR",
      jmpv2_sourcecomponent: "WHOLE_STAGE_PARITY_RECONCILIATION",
      jmpv2_lifecyclekey: lifecycle.jmpv2_lifecyclekey,
      jmpv2_causationid: transitions[0].jmpv2_transitionkey,
      jmpv2_correlationid: transitions[0].jmpv2_correlationid,
      jmpv2_environment: "JM1-Test",
      jmpv2_result: "SUCCEEDED",
      jmpv2_reasoncode: "ENGAGEMENT_PROJECTION_ALIGNED_TO_GOVERNED_LIFECYCLE",
      jmpv2_eventtimestamp: new Date().toISOString(),
    }),
  });
}

const [engagementAfter, lifecycleAfter, bindingsAfter, eventsAfter] = await Promise.all([
  request(`jmpv2_publishingengagements(${engagementId})`),
  request(`jmpv2_lifecycleinstances(${lifecycleId})`),
  rows("jmpv2_sharepointworkspacebindings", `jmpv2_lifecycleinstanceid eq '${lifecycleId}' and jmpv2_bindingstatus eq 'BOUND'`),
  rows("jmpv2_executionevents", `jmpv2_executionkey eq '${eventKey}'`),
]);
assert(engagementAfter.jmpv2_currentstage === "06_ONBOARDING" && lifecycleAfter.jmpv2_currentstagecode === "06_ONBOARDING", "PARITY_REPAIR_READBACK_FAILED");
assert(bindingsAfter.length === 1 && bindingsAfter[0].jmpv2_workspacepath === bindings[0].jmpv2_workspacepath, "WORKSPACE_CHANGED");
assert(eventsAfter.length === 1, "PARITY_EVIDENCE_FAILED");

const result = {
  status: "PASS",
  environment: "JM1-Test",
  author: "Jackuline Fly",
  title: "Whole",
  engagementId,
  lifecycleId,
  rootCause: "MISSING_TRANSACTIONAL_UPDATE",
  repairedByThisRun: repaired,
  lifecycleStage: lifecycleAfter.jmpv2_currentstagecode,
  engagementStage: engagementAfter.jmpv2_currentstage,
  workspacePath: bindingsAfter[0].jmpv2_workspacepath,
  workspaceMoved: false,
  duplicateWorkspaceCreated: false,
  parityEventId: eventsAfter[0].jmpv2_executioneventid,
  completedAt: new Date().toISOString(),
};
mkdirSync(path.dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
