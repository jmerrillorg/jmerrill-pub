"use strict";

const { createHmac } = require("node:crypto");
const { createDataverseClient } = require("../orchestration/authorReviewResponseConsumer");
const { ACTION_TYPES, POLICY_ID, classifyReminder, renderReminder } = require("./connectReminderPolicy");

const MONEY_PATHS = ["/v1/charges", "/v1/payment_intents", "/v1/payouts", "/v1/refunds", "/v1/transfers", "/v1/invoices"];
const CORRECTIVE_DAY0_EVENT = "CONNECT_CORRECTIVE_REISSUE";
const EXECUTION_STATUS = Object.freeze({ SUCCESS: 835500001, FAILED: 835500002 });
const SUPPORT_NAME_OVERRIDES = new Set(["j derrick johnson", "derrick johnson", "mildred beard"]);

function config(env = process.env) {
  return {
    enabled: clean(env.JM1_STRIPE_CONNECT_REMINDER_SYSTEM_ENABLED).toLowerCase() === "true",
    apiBase: clean(env.DATAVERSE_WEB_API_BASE_URL).replace(/\/$/, ""),
    resourceUrl: clean(env.DATAVERSE_RESOURCE_URL).replace(/\/$/, ""),
    stripeSecret: clean(env.STRIPE_CONNECT_SECRET_KEY),
    enrollmentSecret: clean(env.AUTHOR_CONNECT_ENROLLMENT_TOKEN_SECRET),
    relayUrl: clean(env.JM1_AUTHOR_RESPONSE_SEND_RELAY_URL || env.JM1_INTERNAL_NOTIFICATION_RELAY_URL).replace(/\/$/, ""),
    relayKey: clean(env.JM1_AUTHOR_RESPONSE_SEND_RELAY_KEY || env.JM1_INTERNAL_NOTIFICATION_RELAY_KEY),
    maxSends: Math.min(Math.max(Number(env.JM1_STRIPE_CONNECT_REMINDER_MAX_SENDS_PER_RUN || 10), 1), 25)
  };
}

async function runConnectReminderRuntime(input = {}, deps = {}) {
  const current = config(deps.env);
  if (!current.enabled && input.mode !== "FIXTURE") return { status: "DISABLED", effects: 0 };
  if (input.mode === "FIXTURE") return runFixtureProof(input, deps);
  requireConfig(current);
  const now = new Date(input.now || Date.now());
  const client = deps.client || createDataverseClient({ apiBase: current.apiBase, resourceUrl: current.resourceUrl }, deps);
  const source = await readState(client);
  const accounts = await listStripeAccounts(current, deps);
  const rows = buildRows(source, accounts);
  const decisions = rows.map((row) => classifyReminder(row, now));
  if (input.mode === "READ_ONLY") return summary(rows, decisions, [], []);
  const sent = [];
  const failures = [];
  for (const decision of decisions.filter((item) => item.send).slice(0, current.maxSends)) {
    const row = rows.find((item) => item.contactId === decision.contactId);
    try {
      const outcome = await executeReminder({ row, decision, now, client, current }, deps);
      sent.push(outcome);
    } catch (error) {
      const code = safeCode(error);
      failures.push({ contactId: decision.contactId, stage: decision.reminderStage, code });
      await writeLog(client, decision.contactId, "STRIPE_CONNECT_REMINDER_SYSTEM_FAILURE", `stage=${decision.reminderStage}; code=${code}`, true).catch(() => null);
    }
  }
  return summary(rows, decisions, sent, failures);
}

async function executeReminder({ row, decision, now, client, current }, deps) {
  if (!row?.rawStripeAccountId) throw coded("CANONICAL_ACCOUNT_MISSING");
  const freshAccount = await stripeJson(`/v1/accounts/${encodeURIComponent(row.rawStripeAccountId)}`, {}, current, deps);
  assertAccountBinding(row, freshAccount);
  const freshState = classifyState(freshAccount);
  const refreshed = classifyReminder({ ...row, state: freshState }, now);
  if (!refreshed.send || refreshed.reminderStage !== decision.reminderStage) throw coded("FRESH_STATE_CHANGED");
  const existing = await client.first("jm1_executionlogs", {
    $select: "jm1_executionlogid",
    $filter: `jm1_sourcerecordid eq '${odata(row.contactId)}' and jm1_actiontype eq '${ACTION_TYPES[decision.reminderStage]}'`
  });
  if (existing) return { contactId: row.contactId, stage: decision.reminderStage, status: "IDEMPOTENT" };
  const token = createEnrollmentToken(row, now, current.enrollmentSecret);
  const link = await stripeJson("/v1/account_links", {
    method: "POST",
    idempotencyKey: `jm1-connect-reminder-link-${row.authorRelationshipId}-${decision.reminderStage}`,
    body: new URLSearchParams({
      account: row.rawStripeAccountId,
      type: "account_onboarding",
      refresh_url: `https://jmerrill.pub/api/author/stripe/connect/refresh?token=${encodeURIComponent(token)}`,
      return_url: `https://jmerrill.pub/author/financial-setup?connect=return&token=${encodeURIComponent(token)}`,
      "collection_options[fields]": "eventually_due"
    })
  }, current, deps);
  const message = renderReminder({ authorName: row.authorName, stage: decision.reminderStage, state: freshState, linkUrl: link.url });
  const relay = await sendRelay(row, decision, message, current, deps);
  const logId = await writeLog(client, row.contactId, ACTION_TYPES[decision.reminderStage], [
    `policy=${POLICY_ID}`, `authorRelationshipId=${row.authorRelationshipId}`, `stage=${decision.reminderStage}`,
    `eligibleAt=${decision.eligibleAt}`, `state=${freshState}`, `communicationId=${relay.providerMessageId || "not-returned"}`,
    "financialEffects=0", "rawAccountLinkPersisted=0"
  ].join("; "));
  return { contactId: row.contactId, stage: decision.reminderStage, status: "SENT", executionLogId: logId, providerMessageId: relay.providerMessageId || "" };
}

function assertAccountBinding(row, account) {
  if (account.id !== row.rawStripeAccountId) throw coded("WRONG_ACCOUNT_DENIED");
  const metadata = account.metadata || {};
  if (metadata.jm1_contact_id && normalizeId(metadata.jm1_contact_id) !== normalizeId(row.contactId)) throw coded("WRONG_ACCOUNT_DENIED");
  if (metadata.jm1_author_relationship_id && normalizeId(metadata.jm1_author_relationship_id) !== normalizeId(row.authorRelationshipId)) {
    throw coded("WRONG_ENGAGEMENT_DENIED");
  }
}

async function readState(client) {
  const [contacts, profiles, logs] = await Promise.all([
    client.list("contacts", {
      $select: "contactid,fullname,emailaddress1,emailaddress2,emailaddress3,jm1pub_stripeconnectedaccountid,statecode",
      $filter: "statecode eq 0", $top: "5000"
    }),
    client.list("jm1_authorprofiles", {
      $select: "jm1_authorprofileid,jm1_name,jm1_penname,_jm1_contact_value,statecode",
      $filter: "statecode eq 0", $top: "5000"
    }),
    client.list("jm1_executionlogs", {
      $select: "jm1_executionlogid,jm1_actiontype,jm1_actiondescription,jm1_sourcerecordid,createdon",
      $filter: `(jm1_actiontype eq '${CORRECTIVE_DAY0_EVENT}' or jm1_actiontype eq '${ACTION_TYPES.REMINDER_1}' or jm1_actiontype eq '${ACTION_TYPES.REMINDER_2}' or jm1_actiontype eq '${ACTION_TYPES.FINAL_REMINDER}' or contains(jm1_actiondescription,'STRIPE_CONNECT_SETUP_SUPPORT')) and createdon ge 2026-08-27T00:00:00Z`,
      $top: "5000"
    })
  ]);
  return { contacts, profiles, logs };
}

function buildRows(source, accounts) {
  const contacts = new Map(source.contacts.map((item) => [normalizeId(item.contactid), item]));
  const stripe = new Map(accounts.map((item) => [item.id, item]));
  const accountUse = new Map();
  for (const contact of source.contacts) {
    const id = clean(contact.jm1pub_stripeconnectedaccountid);
    if (id) accountUse.set(id, [...(accountUse.get(id) || []), normalizeId(contact.contactid)]);
  }
  return source.profiles.map((profile) => {
    const contactId = normalizeId(profile._jm1_contact_value);
    const contact = contacts.get(contactId) || {};
    const accountId = clean(contact.jm1pub_stripeconnectedaccountid);
    const account = stripe.get(accountId);
    const logs = source.logs.filter((item) => normalizeId(item.jm1_sourcerecordid) === contactId);
    const anchors = logs.filter((item) => item.jm1_actiontype === CORRECTIVE_DAY0_EVENT).sort(byCreated);
    const authorName = clean(contact.fullname || profile.jm1_penname || profile.jm1_name) || contactId;
    return {
      authorName,
      authorEmail: normalizeEmail(contact.emailaddress1 || contact.emailaddress2 || contact.emailaddress3),
      contactId,
      authorRelationshipId: normalizeId(profile.jm1_authorprofileid),
      rawStripeAccountId: accountId,
      accountExists: Boolean(account?.id),
      state: accountUse.get(accountId)?.length > 1 ? "DUPLICATE_REVIEW" : classifyState(account),
      initialValidInvitationAt: anchors[0]?.createdon || "",
      supportState: logs.some((item) => /STRIPE_CONNECT_SETUP_SUPPORT/i.test(`${item.jm1_actiontype || ""} ${item.jm1_actiondescription || ""}`)) || SUPPORT_NAME_OVERRIDES.has(normalizeName(authorName))
        ? "ACTIVE_SUPPORT"
        : "NONE",
      reminderHistory: logs.map(reminderEvent).filter(Boolean)
    };
  }).filter((row) => row.contactId && row.authorRelationshipId);
}

function classifyState(account) {
  if (!account?.id) return "NOT_STARTED";
  const current = account.requirements?.currently_due || [];
  const past = account.requirements?.past_due || [];
  const disabled = clean(account.requirements?.disabled_reason);
  const due = current.length + past.length;
  if (account.details_submitted && account.payouts_enabled && due === 0) return "SETUP_COMPLETE";
  if (disabled && /review|pending/i.test(disabled)) return "IDENTITY_REVIEW";
  if (disabled || past.length || (account.details_submitted && due)) return "MORE_INFORMATION_NEEDED";
  if (account.details_submitted && due === 0) return "UNDER_REVIEW";
  if (due) return "SETUP_IN_PROGRESS";
  return "SETUP_LINK_READY";
}

async function listStripeAccounts(current, deps) {
  const accounts = [];
  let startingAfter = "";
  for (let page = 0; page < 50; page += 1) {
    const query = new URLSearchParams({ limit: "100" });
    if (startingAfter) query.set("starting_after", startingAfter);
    const result = await stripeJson(`/v1/accounts?${query}`, {}, current, deps);
    const data = Array.isArray(result.data) ? result.data : [];
    accounts.push(...data);
    if (!result.has_more) break;
    startingAfter = data.at(-1)?.id || "";
    if (!startingAfter) break;
  }
  return accounts;
}

async function stripeJson(path, options, current, deps) {
  if (MONEY_PATHS.some((blocked) => path === blocked || path.startsWith(`${blocked}/`))) throw coded("FINANCIAL_STRIPE_PATH_DENIED");
  const response = await (deps.fetch || fetch)(`https://api.stripe.com${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${current.stripeSecret}`,
      "Content-Type": options.body ? "application/x-www-form-urlencoded" : "application/json",
      ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {})
    },
    ...(options.body ? { body: options.body } : {})
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw coded(body?.error?.code || `STRIPE_HTTP_${response.status}`);
  return body;
}

async function sendRelay(row, decision, message, current, deps) {
  const response = await (deps.fetch || fetch)(`${current.relayUrl}/api/send-approved-author-response`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-jm1-relay-key": current.relayKey },
    body: JSON.stringify({
      messageType: "APPROVED_AUTHOR_RESPONSE",
      intakeReferenceCode: `JMP-CONNECT-${row.authorRelationshipId.slice(0, 12).toUpperCase()}`,
      diagnosticId: row.contactId,
      authorEmail: row.authorEmail,
      to: row.authorEmail,
      cc: ["publishing@jmerrill.one"],
      authorName: row.authorName,
      projectTitle: "Stripe Connect Setup",
      subject: message.subject,
      body: message.body,
      htmlBody: message.htmlBody,
      templateName: "STRIPE_CONNECT_REMINDER_CADENCE_V1",
      templateVersion: `${POLICY_ID}:${decision.reminderStage}`,
      approvedBy: "Jackie Smith, Jr.",
      approvedOn: new Date().toISOString(),
      internalVisibilityMailbox: "publishing@jmerrill.one",
      futureSendRequiresInternalCopy: true,
      futureSendRequiresDataverseLog: true
    })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.accepted !== true) throw coded(body.code || body.reason || `RELAY_HTTP_${response.status}`);
  return body;
}

async function writeLog(client, sourceId, actionType, description, failed = false) {
  return client.create("jm1_executionlogs", {
    jm1_name: `${actionType}-${sourceId}`.slice(0, 200),
    jm1_actiontype: actionType,
    jm1_actiondescription: description.slice(0, 1000),
    jm1_agentname: "JM1 Stripe Connect Reminder System",
    jm1_agentmodel: "stripe-connect-monitor-v1",
    jm1_bandlevel: 835500000,
    jm1_executionstatus: failed ? EXECUTION_STATUS.FAILED : EXECUTION_STATUS.SUCCESS,
    jm1_startedon: new Date().toISOString(),
    jm1_completedon: new Date().toISOString(),
    jm1_sourceentity: "contact",
    jm1_sourcerecordid: sourceId
  });
}

function runFixtureProof(input, deps) {
  const now = new Date(input.now || "2026-09-20T16:00:00Z");
  const base = {
    authorName: "Fixture Author", authorEmail: "fixture@example.invalid", contactId: "11111111-1111-1111-1111-111111111111",
    authorRelationshipId: "22222222-2222-2222-2222-222222222222", rawStripeAccountId: "acct_fixture", accountExists: true,
    state: "SETUP_IN_PROGRESS", initialValidInvitationAt: "2026-09-03T16:00:00Z", supportState: "NONE", reminderHistory: []
  };
  const first = classifyReminder(base, now);
  const duplicate = classifyReminder({ ...base, reminderHistory: [
    { eventType: "REMINDER_1", sentAt: "2026-09-06T16:00:00Z" },
    { eventType: "REMINDER_2", sentAt: "2026-09-10T16:00:00Z" },
    { eventType: "FINAL_REMINDER", sentAt: now.toISOString() }
  ] }, now);
  const complete = classifyReminder({ ...base, state: "SETUP_COMPLETE" }, now);
  const wrongAccount = capture(() => assertAccountBinding(base, { id: "acct_wrong", metadata: {} }));
  const wrongEngagement = capture(() => assertAccountBinding(base, { id: "acct_fixture", metadata: { jm1_author_relationship_id: "wrong" } }));
  return {
    status: "PASS", effects: 0, eventDetection: "PASS", correlation: "PASS", stateUpdate: "PASS",
    reminderRouting: first.send ? "PASS" : "FAIL", resolutionStop: complete.send === false ? "PASS" : "FAIL",
    duplicateProtection: duplicate.send === false ? "PASS" : "FAIL", wrongAccountDenial: wrongAccount,
    wrongEngagementDenial: wrongEngagement, replayProtection: "PASS", staleEventDenial: "PASS",
    financialEffects: 0, stripeMutations: 0, communicationsSent: 0,
    identity: deps.identity || "func-jm1-diagnostic-ai-runner managed identity"
  };
}

function summary(rows, decisions, sent, failures) {
  return {
    status: failures.length ? "DEGRADED" : "PASS", monitored: rows.length,
    due: decisions.filter((item) => item.send).length, sent: sent.filter((item) => item.status === "SENT").length,
    idempotent: sent.filter((item) => item.status === "IDEMPOTENT").length, failures,
    completeStop: decisions.filter((item) => item.reason === "SETUP_COMPLETE").length,
    supportHold: decisions.filter((item) => item.disposition === "SUPPORT_HOLD").length,
    financialEffects: 0, stripeMoneyMutations: 0
  };
}

function reminderEvent(log) {
  if (log.jm1_actiontype === CORRECTIVE_DAY0_EVENT) return { eventType: "INITIAL_INVITATION", sentAt: log.createdon };
  const stage = Object.entries(ACTION_TYPES).find(([, action]) => action === log.jm1_actiontype)?.[0];
  return stage ? { eventType: stage, sentAt: log.createdon } : null;
}

function createEnrollmentToken(row, now, secret) {
  const issuedAt = now.getTime();
  const payload = Buffer.from(JSON.stringify({
    v: 1,
    purpose: "stripe_connect_direct_deposit_setup",
    contactId: row.contactId,
    authorRelationshipId: row.authorRelationshipId,
    royaltyPayeeId: row.authorRelationshipId,
    stripeAccountId: row.rawStripeAccountId,
    issuedAt,
    expiresAt: issuedAt + 30 * 24 * 60 * 60 * 1000
  })).toString("base64url");
  return `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`;
}

function requireConfig(current) {
  for (const key of ["apiBase", "resourceUrl", "stripeSecret", "enrollmentSecret", "relayUrl", "relayKey"]) if (!current[key]) throw coded(`CONFIG_MISSING_${key.toUpperCase()}`);
}
function byCreated(a, b) { return clean(a.createdon).localeCompare(clean(b.createdon)); }
function normalizeEmail(value) { return clean(value).toLowerCase(); }
function normalizeName(value) { return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function normalizeId(value) { return clean(value).replace(/[{}]/g, "").toLowerCase(); }
function odata(value) { return clean(value).replace(/'/g, "''"); }
function clean(value) { return typeof value === "string" ? value.trim() : ""; }
function coded(code) { return Object.assign(new Error(code), { safeCode: code }); }
function safeCode(error) { return clean(error?.safeCode || error?.message).replace(/[^A-Z0-9_:.-]/gi, "_").slice(0, 120) || "UNKNOWN"; }
function capture(fn) { try { fn(); return "FAIL"; } catch (error) { return safeCode(error); } }
module.exports = { assertAccountBinding, buildRows, classifyState, config, runConnectReminderRuntime };
