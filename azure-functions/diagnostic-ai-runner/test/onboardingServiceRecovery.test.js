"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { serviceIntent, serviceCopy } = require("../src/mail/inbound/serviceIntent");
const { authorReplyText } = require("../src/mail/inbound/replyText");
const { renderServiceCorrespondence } = require("../../acs-email-relay/src/templates/renderer");
const { htmlProjectionHashes, textProjectionHash } = require("../src/mail/inbound/mailboxBodyProjection");

test("relay HTML preserves the exact plain-text recovery correspondence for mailbox readback", () => {
  const copy = serviceCopy("AUTHOR_ONBOARDING_SERVICE_RECOVERY", "Jackuline Fly", "Whole", "Onboarding help");
  assert.ok(htmlProjectionHashes(renderServiceCorrespondence(copy.body)).includes(textProjectionHash(copy.body)));
});

test("quoted iPhone correspondence cannot manufacture a contact-change request", () => {
  const graphMessage = { body: { content: "I answered all the areas I could.\r\n\r\n> On Sep 26, 2026, at 5:21 PM, Publishing wrote:\r\n> Please use a different email address." } };
  assert.equal(authorReplyText(graphMessage), "I answered all the areas I could.");
  assert.equal(serviceIntent(graphMessage, "AUTHOR_ACCESS_REQUEST").intent, "AUTHOR_ONBOARDING_SERVICE_RECOVERY");
});

test("quoted contact-change language does not override an initial access request", () => {
  const graphMessage = { body: { content: "I found the onboarding invitation.\n\n> On Sep 26, 2026, at 5:21 PM, Publishing wrote:\n> A different email address needs verification." } };
  assert.equal(serviceIntent(graphMessage, "AUTHOR_ACCESS_REQUEST").intent, "AUTHOR_ONBOARDING_ACCESS");
});

test("repeated onboarding failure supersedes access retry advice", () => {
  const result = serviceIntent({ body: { content: "I answered all areas of onboarding. It failed again and I need assistance." } }, "AUTHOR_ACCESS_REQUEST");
  assert.equal(result.intent, "AUTHOR_ONBOARDING_SERVICE_RECOVERY");
  assert.equal(result.humanGate, false);
});

test("verification error routes to system recovery even without an access classification", () => {
  const result = serviceIntent({ body: { content: "The form says my relationship could not be verified." } }, "AUTHOR_CLARIFICATION");
  assert.equal(result.intent, "AUTHOR_ONBOARDING_SERVICE_RECOVERY");
});

test("recovery correspondence ends retries without falsely asserting answers or advancement", () => {
  const copy = serviceCopy("AUTHOR_ONBOARDING_SERVICE_RECOVERY", "Jackuline Fly", "Whole", "Onboarding help");
  assert.match(copy.body, /You do not need to complete the onboarding form again or request another code/);
  assert.match(copy.body, /We are sorry/);
  assert.doesNotMatch(copy.body, /Please try|tell us where|have what you submitted|onboarding is complete|moved.*next stage|Dataverse|runtime|Cody|backend/i);
});

test("initial access question retains its separate identity verification rule", () => {
  assert.equal(serviceIntent({ body: { content: "I found the onboarding invitation." } }, "AUTHOR_ACCESS_REQUEST").intent, "AUTHOR_ONBOARDING_ACCESS");
});
