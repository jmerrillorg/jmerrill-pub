import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../plugin/Phase6OnboardingAuthorityPlugin.cs", import.meta.url), "utf8");
const project = readFileSync(new URL("../plugin/JMPPublishingV2Phase6.csproj", import.meta.url), "utf8");

test("command uses fail-closed environment configuration without environment identity coupling", () => {
  assert.match(source, /jmpv2_Phase6OnboardingCommandEnabled/);
  assert.match(source, /PHASE6_ENVIRONMENT_NOT_ENABLED/);
  assert.doesNotMatch(source, /JM1_DEV_REQUIRED|org52409ff2|jm1test\.crm|579864ae|bb7a9d9e/);
});

test("authorization, stage, idempotency, and workspace guards remain present", () => {
  assert.match(source, /V2_ONBOARDING_AUTHORITY/);
  assert.match(source, /UNAUTHORIZED_ONBOARDING_COMMAND/);
  assert.match(source, /06_ONBOARDING/);
  assert.match(source, /STALE_VERSION/);
  assert.match(source, /DUPLICATE_WORKSPACE/);
  assert.match(source, /\/01_Pipeline_A-Z/);
  assert.match(source, /DIRECT_ONBOARDING_COMPLETION_WRITE_DENIED/);
});

test("portable assembly preserves Dataverse identity and versions the file build", () => {
  assert.match(project, /<AssemblyVersion>1\.0\.0\.0<\/AssemblyVersion>/);
  assert.match(project, /<FileVersion>1\.1\.0\.0<\/FileVersion>/);
  assert.match(project, /<Deterministic>true<\/Deterministic>/);
  assert.match(project, /JMP_PHASE6_SIGNING_KEY_PATH/);
});

test("engagement, author, title, and lifecycle correlation fails closed on durable identifiers", () => {
  assert.match(source, /ValidateCorrelation/);
  assert.match(source, /AUTHOR_ENGAGEMENT_MISMATCH/);
  assert.match(source, /TITLE_ENGAGEMENT_MISMATCH/);
  assert.match(source, /WORK_ENGAGEMENT_MISMATCH/);
  assert.match(source, /TryRetrieve\(s, "contact", authorId/);
  assert.match(source, /TryRetrieve\(s, "jm1pub_title", titleId/);
  assert.doesNotMatch(source, /new Entity\("jmpv2_publishingengagement", engagementId\)/);
});
