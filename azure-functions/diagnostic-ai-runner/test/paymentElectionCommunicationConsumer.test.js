"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  EFFECT_STATE,
  TEMPLATE_ID,
  buildCommunicationRequest,
  parsePaymentElectionActionRequest,
  processPaymentElectionCommunication,
  resolveCurrentRequirement,
  runPaymentElectionCommunicationConsumer
} = require("../src/orchestration/paymentElectionCommunicationConsumer");
const { NEW_FINANCING_POLICY_VERSION } = require("../src/author/paymentPolicyEngine");

const REQUEST_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function actionRequest(overrides = {}) {
  return {
    actionRequestId: REQUEST_ID,
    status: "OPEN",
    currentRequirement: "YES",
    communicationAuthority: "JM1_COMMS_002A",
    opportunityId: "11111111-1111-4111-8111-111111111111",
    agreementId: "22222222-2222-4222-8222-222222222222",
    agreementVersion: "v1.0",
    agreementChecksum: "a".repeat(64),
    correlationId: "payment-election-required:test",
    contractedTotalUsd: 1999,
    paymentPolicyVersion: NEW_FINANCING_POLICY_VERSION,
    packageName: "Starter",
    title: "A New Beginning",
    ...overrides
  };
}

function currentState(overrides = {}) {
  return {
    recipient: "author@example.com",
    authorFirstName: "Avery",
    projectTitle: "A New Beginning",
    packageName: "Starter",
    contractedTotalUsd: 1999,
    paymentPolicyVersion: NEW_FINANCING_POLICY_VERSION,
    agreementId: "22222222-2222-4222-8222-222222222222",
    ...overrides
  };
}

test("parser accepts explicit current JM1-COMMS-002A action authority", () => {
  const parsed = parsePaymentElectionActionRequest({
    jm1_executionlogid: REQUEST_ID,
    jm1_actiondescription: `status=OPEN; currentRequirement=YES; communicationAuthority=JM1_COMMS_002A; opportunityId=11111111-1111-4111-8111-111111111111; agreementId=22222222-2222-4222-8222-222222222222; agreementChecksum=${"a".repeat(64)}; contractedTotalUsd=1999.00`
  });
  assert.equal(parsed.status, "OPEN");
  assert.equal(parsed.currentRequirement, "YES");
  assert.equal(parsed.communicationAuthority, "JM1_COMMS_002A");
  assert.equal(parsed.contractedTotalUsd, 1999);
});

test("request uses the exact governed template, all seven policy-derived options, and no identity overrides", () => {
  const payload = buildCommunicationRequest(actionRequest(), currentState());
  assert.equal(payload.templateId, TEMPLATE_ID);
  assert.equal(payload.templateVersion, "1.0.0");
  assert.equal(payload.templateData.packageName, "Starter Publishing Package");
  assert.deepEqual(payload.templateData.options.map((option) => option.code), ["FULL_PAY", "2_PAY", "4_PAY", "8_PAY", "12_PAY", "18_PAY", "24_PAY"]);
  assert.equal(payload.from, undefined);
  assert.equal(payload.cc, undefined);
  assert.equal(payload.replyTo, undefined);
  assert.match(payload.idempotencyKey, new RegExp(REQUEST_ID));
});

test("current requirement records pending, ACS acceptance, and author wait states", async () => {
  const writes = [];
  const sends = [];
  const result = await processPaymentElectionCommunication({}, actionRequest(), {
    findEffectLog: async () => null,
    resolveCurrentRequirement: async () => ({ ok: true, value: currentState() }),
    writeEffectLog: async (_client, _id, type, description) => writes.push({ type, description }),
    sendGovernedCommunication: async (payload) => {
      sends.push(payload);
      return { ok: true, body: { jm1MessageId: "message-1", providerMessageId: "provider-1", deliveryState: "ACCEPTED", senderAddress: "publishing@email.jmerrill.one", brandCc: ["publishing@jmerrill.one"], replyTo: "publishing@jmerrill.one" } };
    }
  });
  assert.equal(result.outcome, "COMMUNICATION_ACCEPTED");
  assert.equal(sends.length, 1);
  assert.deepEqual(writes.map((entry) => entry.type), [EFFECT_STATE.PENDING, EFFECT_STATE.ACCEPTED, EFFECT_STATE.WAITING]);
  assert.match(writes[1].description, /deliveryReadback=ACCEPTANCE_ONLY/);
});

test("terminal evidence suppresses duplicate delivery", async () => {
  let sends = 0;
  const result = await processPaymentElectionCommunication({}, actionRequest(), {
    findEffectLog: async () => ({ jm1_actiontype: EFFECT_STATE.WAITING }),
    sendGovernedCommunication: async () => { sends += 1; }
  });
  assert.equal(result.outcome, "IDEMPOTENT_NO_SEND");
  assert.equal(sends, 0);
});

test("live revalidation rejects a selected payment option before contract or recipient lookup", async () => {
  let secondaryReads = 0;
  const client = {
    first: async (entity) => {
      if (entity === "opportunities") {
        return { statecode: 0, jm1_m6paymentoptionselectionstatus: "PAYMENT_OPTION_SELECTED", jm1_m6selectedpaymentoption: "FULL_PAY" };
      }
      secondaryReads += 1;
      return null;
    },
    list: async () => { secondaryReads += 1; return []; }
  };
  const result = await resolveCurrentRequirement(client, actionRequest({ title: "Whole" }));
  assert.equal(result.ok, false);
  assert.equal(result.reason, "PAYMENT_OPTION_ALREADY_SELECTED");
  assert.equal(secondaryReads, 0);
});

test("live revalidation rejects a superseded agreement before recipient lookup", async () => {
  let contactReads = 0;
  const client = {
    first: async (entity) => {
      if (entity === "opportunities") return { statecode: 0, _parentcontactid_value: "33333333-3333-4333-8333-333333333333" };
      contactReads += 1;
      return null;
    },
    list: async () => [{ jm1pub_contractid: "44444444-4444-4444-8444-444444444444", statecode: 0 }]
  };
  const result = await resolveCurrentRequirement(client, actionRequest());
  assert.equal(result.ok, false);
  assert.equal(result.reason, "AGREEMENT_SUPERSEDED");
  assert.equal(contactReads, 0);
});

test("manual continuity fulfillment suppresses recovered automation", async () => {
  let sends = 0;
  const result = await processPaymentElectionCommunication({}, actionRequest(), {
    findEffectLog: async () => ({ jm1_actiontype: EFFECT_STATE.MANUAL }),
    sendGovernedCommunication: async () => { sends += 1; }
  });
  assert.equal(result.outcome, "IDEMPOTENT_NO_SEND");
  assert.equal(result.terminalState, EFFECT_STATE.MANUAL);
  assert.equal(sends, 0);
});

for (const reason of ["PAYMENT_OPTION_ALREADY_SELECTED", "AGREEMENT_SUPERSEDED"]) {
  test(`${reason} cancels without sending`, async () => {
    const writes = [];
    let sends = 0;
    const result = await processPaymentElectionCommunication({}, actionRequest(), {
      findEffectLog: async () => null,
      resolveCurrentRequirement: async () => ({ ok: false, reason }),
      writeEffectLog: async (_client, _id, type) => writes.push(type),
      sendGovernedCommunication: async () => { sends += 1; }
    });
    assert.equal(result.outcome, "CANCELLED_SUPERSEDED");
    assert.deepEqual(writes, [EFFECT_STATE.CANCELLED]);
    assert.equal(sends, 0);
  });
}

test("relay failure leaves the action open for a governed retry", async () => {
  const writes = [];
  const result = await processPaymentElectionCommunication({}, actionRequest(), {
    findEffectLog: async (_client, _id, types) => types.includes(EFFECT_STATE.PENDING) ? { jm1_actiontype: EFFECT_STATE.PENDING } : null,
    resolveCurrentRequirement: async () => ({ ok: true, value: currentState() }),
    writeEffectLog: async (_client, _id, type, description) => writes.push({ type, description }),
    sendGovernedCommunication: async () => ({ ok: false, reason: "ACS_SEND_FAILED" })
  });
  assert.equal(result.outcome, "COMMUNICATION_FAILED");
  assert.deepEqual(writes.map((entry) => entry.type), [EFFECT_STATE.FAILED]);
  assert.match(writes[0].description, /requirementStatus=OPEN/);
});

test("Whole after a selected Full Pay election cannot be delivered by the consumer", async () => {
  let sends = 0;
  const result = await runPaymentElectionCommunicationConsumer({ forceEnabled: true }, {
    client: {},
    findActionRequests: async () => [actionRequest({ title: "Whole" })],
    findEffectLog: async () => null,
    resolveCurrentRequirement: async () => ({ ok: false, reason: "PAYMENT_OPTION_ALREADY_SELECTED" }),
    writeEffectLog: async () => ({}),
    sendGovernedCommunication: async () => { sends += 1; }
  });
  assert.equal(result.cancelled, 1);
  assert.equal(result.accepted, 0);
  assert.equal(sends, 0);
});
