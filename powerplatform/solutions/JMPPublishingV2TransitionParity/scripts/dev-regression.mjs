import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const environmentUrl = process.env.JMP_TRANSITION_DEV_ENVIRONMENT_URL;
const expectedOrganizationId = process.env.JMP_TRANSITION_DEV_ORGANIZATION_ID;
const root = path.resolve(import.meta.dirname, "..");
const output = path.join(root, "evidence", "dev-regression.json");
if (!environmentUrl || !expectedOrganizationId) throw new Error("Dev environment URL and organization ID are required");
const run = `TRANSITION-PARITY-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
const token = execFileSync("az", ["account", "get-access-token", "--resource", environmentUrl, "--query", "accessToken", "-o", "tsv"], { encoding: "utf8" }).trim();
const base = `${environmentUrl.replace(/\/$/, "")}/api/data/v9.2`;
async function request(route, options = {}) {
  const response = await fetch(`${base}/${route}`, { ...options, headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json", ...(options.headers ?? {}) } });
  const text = await response.text(); const body = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${options.method ?? "GET"} ${route} ${response.status}: ${text.slice(0, 1200)}`);
  return body;
}
const rows = async (set, filter) => (await request(`${set}?$filter=${encodeURIComponent(filter)}`)).value ?? [];
const assert = (condition, code) => { if (!condition) throw new Error(code); };

const who = await request("WhoAmI()");
assert(String(who.OrganizationId).toLowerCase() === expectedOrganizationId.toLowerCase(), "WRONG_DEV_ENVIRONMENT");
const idempotencyKey = `${run}:05-to-06`;
const correlationId = `${run}:correlation`;
const titleId = crypto.randomUUID();
const authorId = crypto.randomUUID();
const recognizedEvidence = [
  ["02_INTAKE", "COMPLETE", "V1_INTAKE_RECORD"],
  ["MANUSCRIPT_SUBMISSION", "COMPLETE", "V1_MANUSCRIPT_ARTIFACT"],
  ["03_EDITORIAL_REVIEW", "COMPLETE", "V1_EDITORIAL_REVIEW_COMPLETION"],
  ["04_PACKAGE_SELECTION", "ACCEPTED", "FOUNDER_CONFIRMED_PACKAGE_ACCEPTANCE_ONLY"],
].map(([stage, status, classification]) => `V1~${stage}~${status}~${crypto.randomUUID()}~${crypto.randomUUID()}~${run}:${stage}~${classification}~YES`).join("||");
const activation = await request("jmpv2_ActivateLegacyEngagement", { method: "POST", body: JSON.stringify({ LegacyCanonicalTitleId: titleId, LegacyCanonicalAuthorId: authorId, LegacyCanonicalTitleName: "Synthetic Transition Parity", LegacyCanonicalAuthorName: "Synthetic Author", LegacyIdentityAuthority: "CORE_CANONICAL_IDENTITY_COUNT_TITLE_1_AUTHOR_1", LegacyFirstV2Stage: "05_AGREEMENT_PAYMENT", LegacyRecognizedEvidence: recognizedEvidence, LegacyCommercialContext: "MODEL=STANDARD_PAID;PACKAGE=Starter Publishing Package;PRICE_USD=1999;CURRENCY=USD;ACCEPTANCE=FOUNDER_CONFIRMED_AUTHORITATIVE", LegacyActor: "jmpv2-authorized-legacy-activation-actor", LegacyAuthorityContext: "V2_LEGACY_ACTIVATION_AUTHORITY", LegacyCorrelationId: `${run}:activation`, LegacyIdempotencyKey: `${run}:activation`, LegacyWorkspaceSiteId: "transition-parity-dev-site", LegacyWorkspaceDriveId: "transition-parity-dev-drive", LegacyWorkspaceItemId: `${run}:workspace`, LegacyWorkspacePath: `/01_Pipeline_A-Z/05 - Agreement & Payment/${run}`, LegacyWorkspaceName: run, LegacyTestClassification: "SYNTHETIC_TRANSITION_PARITY_REGRESSION" }) });
assert(activation.LegacyAccepted === true, "GOVERNED_LEGACY_ACTIVATION_FAILED");
const lifecycleId = activation.LegacyLifecycleInstanceId;
const engagementId = activation.LegacyEngagementId;
const lifecycleBefore = await request(`jmpv2_lifecycleinstances(${lifecycleId})`);
const lifecycleKey = lifecycleBefore.jmpv2_lifecyclekey;
const command = { LifecycleInstanceId: lifecycleId, ExpectedCurrentStage: "05_AGREEMENT_PAYMENT", RequestedNextStage: "06_ONBOARDING", Actor: "phase1b-authorized-actor", AuthorityContext: "V2_TRANSITION_AUTHORITY", V2CorrelationId: correlationId, IdempotencyKey: idempotencyKey, ExpectedVersion: 1 };
const first = await request("jmpv2_RequestTransitionV2", { method: "POST", body: JSON.stringify(command) });
assert(first.Accepted === true && first.Replay === false && first.CurrentStage === "06_ONBOARDING", "INITIAL_TRANSITION_FAILED");
const second = await request("jmpv2_RequestTransitionV2", { method: "POST", body: JSON.stringify(command) });
assert(second.Accepted === true && second.Replay === true && second.TransitionId === first.TransitionId, "IDEMPOTENT_REPLAY_FAILED");
const [lifecycle, engagement, transitions, stages06] = await Promise.all([
  request(`jmpv2_lifecycleinstances(${lifecycleId})`), request(`jmpv2_publishingengagements(${engagementId})`),
  rows("jmpv2_transitionevents", `jmpv2_idempotencykey eq '${idempotencyKey}'`),
  rows("jmpv2_stageinstances", `jmpv2_lifecyclekey eq '${lifecycleKey}' and jmpv2_stagecode eq '06_ONBOARDING'`),
]);
assert(lifecycle.jmpv2_currentstagecode === "06_ONBOARDING" && lifecycle.jmpv2_lifecycleversion === 2, "LIFECYCLE_PARITY_FAILED");
assert(engagement.jmpv2_currentstage === "06_ONBOARDING", "ENGAGEMENT_PARITY_FAILED");
assert(transitions.length === 1 && stages06.length === 1, "DUPLICATE_TRANSITION_OR_STAGE");
const result = { status: "PASS", run, environment: "JM1-Dev", organizationId: who.OrganizationId, first, replay: second, lifecycleId, engagementId, lifecycleStage: lifecycle.jmpv2_currentstagecode, engagementStage: engagement.jmpv2_currentstage, transitionEvents: transitions.length, stage06Instances: stages06.length, realTitleMutations: 0, productionDeployments: 0, completedAt: new Date().toISOString() };
mkdirSync(path.dirname(output), { recursive: true }); writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`); console.log(JSON.stringify(result, null, 2));
