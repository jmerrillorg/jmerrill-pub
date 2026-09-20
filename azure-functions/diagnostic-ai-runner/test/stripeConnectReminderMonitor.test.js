"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { ACTION_TYPES, POLICY_ID, classifyReminder, renderReminder } = require("../src/stripe/connectReminderPolicy");
const { assertAccountBinding, runConnectReminderRuntime } = require("../src/stripe/connectReminderRuntime");
const { isNoonEastern } = require("../src/functions/runStripeConnectReminderMonitor");
const { createDataverseClient } = require("../src/orchestration/authorReviewResponseConsumer");

function row(overrides = {}) {
  return {
    authorName: "Fixture Author",
    contactId: "11111111-1111-1111-1111-111111111111",
    authorRelationshipId: "22222222-2222-2222-2222-222222222222",
    rawStripeAccountId: "acct_fixture",
    accountExists: true,
    state: "SETUP_IN_PROGRESS",
    initialValidInvitationAt: "2026-09-01T16:00:00Z",
    supportState: "NONE",
    reminderHistory: [],
    ...overrides
  };
}

test("preserves the governed Day 3, 7, 14 cadence and stop condition", () => {
  assert.equal(POLICY_ID, "JMP-STRIPE-CONNECT-REMINDER-CADENCE-v1");
  const day3 = classifyReminder(row(), "2026-09-04T16:00:00Z");
  assert.equal(day3.reminderStage, "REMINDER_1");
  const day7 = classifyReminder(row({ reminderHistory: [{ eventType: "REMINDER_1", sentAt: "2026-09-04T16:00:00Z" }] }), "2026-09-08T16:00:00Z");
  assert.equal(day7.reminderStage, "REMINDER_2");
  const day14 = classifyReminder(row({ reminderHistory: [
    { eventType: "REMINDER_1", sentAt: "2026-09-04T16:00:00Z" },
    { eventType: "REMINDER_2", sentAt: "2026-09-08T16:00:00Z" }
  ] }), "2026-09-15T16:00:00Z");
  assert.equal(day14.reminderStage, "FINAL_REMINDER");
  assert.equal(classifyReminder(row({ state: "SETUP_COMPLETE" }), "2026-09-15T16:00:00Z").send, false);
  assert.equal(ACTION_TYPES.FINAL_REMINDER, "STRIPE_CONNECT_FINAL_REMINDER_SENT");
});

test("fails closed for support, wrong account, and wrong relationship", () => {
  assert.equal(classifyReminder(row({ supportState: "ACTIVE_SUPPORT" }), "2026-09-15T16:00:00Z").disposition, "SUPPORT_HOLD");
  assert.throws(() => assertAccountBinding(row(), { id: "acct_wrong", metadata: {} }), /WRONG_ACCOUNT_DENIED/);
  assert.throws(() => assertAccountBinding(row(), { id: "acct_fixture", metadata: { jm1_author_relationship_id: "wrong" } }), /WRONG_ENGAGEMENT_DENIED/);
});

test("renders the canonical sender-facing communication content without payment promises", () => {
  const rendered = renderReminder({ authorName: "Fixture Author", stage: "REMINDER_1", state: "SETUP_IN_PROGRESS", linkUrl: "https://example.invalid/setup" });
  assert.match(rendered.body, /Good day, Fixture/);
  assert.match(rendered.body, /direct deposit setup/i);
  assert.doesNotMatch(rendered.body, /payment date|royalty amount|promise of payment/i);
});

test("production fixture certification proves routing and denial controls with zero effects", async () => {
  const result = await runConnectReminderRuntime({ mode: "FIXTURE" });
  assert.equal(result.status, "PASS");
  assert.equal(result.effects, 0);
  assert.equal(result.reminderRouting, "PASS");
  assert.equal(result.resolutionStop, "PASS");
  assert.equal(result.duplicateProtection, "PASS");
  assert.equal(result.wrongAccountDenial, "WRONG_ACCOUNT_DENIED");
  assert.equal(result.wrongEngagementDenial, "WRONG_ENGAGEMENT_DENIED");
  assert.equal(result.financialEffects, 0);
});

test("hourly timer executes business evaluation only at noon Eastern", () => {
  assert.equal(isNoonEastern(new Date("2026-09-20T16:00:00Z")), true);
  assert.equal(isNoonEastern(new Date("2026-09-20T15:00:00Z")), false);
  assert.equal(isNoonEastern(new Date("2026-12-20T17:00:00Z")), true);
});

test("Dataverse reads follow server pagination so the full author estate is monitored", async () => {
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async (url) => {
    calls.push(String(url));
    const secondPage = String(url).includes("page=2");
    return new Response(JSON.stringify(secondPage
      ? { value: [{ id: 2 }] }
      : { value: [{ id: 1 }], "@odata.nextLink": "https://example.crm.dynamics.com/api/data/v9.2/contacts?page=2" }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
  try {
    const client = createDataverseClient(
      { apiBase: "https://example.crm.dynamics.com/api/data/v9.2", resourceUrl: "https://example.crm.dynamics.com" },
      { getToken: async () => "fixture-token" }
    );
    const rows = await client.list("contacts", { $top: "5000" });
    assert.deepEqual(rows, [{ id: 1 }, { id: 2 }]);
    assert.equal(calls.length, 2);
  } finally {
    global.fetch = originalFetch;
  }
});

test("Function registration and webhook source preserve system and financial boundaries", () => {
  const root = path.resolve(__dirname, "../../..");
  const index = fs.readFileSync(path.join(root, "azure-functions/diagnostic-ai-runner/src/index.js"), "utf8");
  const wrapper = fs.readFileSync(path.join(root, "azure-functions/diagnostic-ai-runner/src/functions/runStripeConnectReminderMonitor.js"), "utf8");
  const webhook = fs.readFileSync(path.join(root, "app/api/author/stripe/webhook/route.ts"), "utf8");
  assert.match(index, /runStripeConnectReminderMonitor/);
  assert.match(wrapper, /app\.timer\("run-stripe-connect-reminder-monitor"/);
  assert.match(wrapper, /run-stripe-connect-reminder-monitor-certification/);
  assert.match(webhook, /findSafeExecutionLogByName/);
  assert.match(webhook, /stripe_connect_event_already_applied/);
  assert.match(webhook, /eventCreatedAt/);
});
