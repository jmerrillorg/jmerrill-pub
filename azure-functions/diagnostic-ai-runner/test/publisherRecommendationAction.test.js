"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  ACTION,
  RESEND_EVENT,
  runPublisherRecommendationAction,
  buildRecommendationResendEventPayload
} = require("../src/functions/runPublisherRecommendationAction");
const { INTERNAL_VISIBILITY_MAILBOX } = require("../src/author/authorResponseDraftBuilder");

const DIAGNOSTIC_ID = "18cb5c53-6076-f111-ab0f-000d3a9eacee";
const INTAKE_REFERENCE = "JMP-INT-202607-0W5PTQ";

function draftResult() {
  return {
    ok: true,
    view: {
      diagnosticId: DIAGNOSTIC_ID,
      intakeReferenceCode: INTAKE_REFERENCE,
      author: {
        name: "Jackie Smith Jr.",
        email: "chosen2k7@example.com"
      },
      project: {
        title: "The Intentional Leader"
      },
      authorFacingRecommendationDraft: {
        subject: "Editorial Recommendation Letter for The Intentional Leader",
        body: [
          "J Merrill Publishing",
          "Editorial Recommendation Letter",
          "",
          "Good day, Jackie,",
          "",
          "Before we ever ask an author to invest in us, we first invest in understanding their manuscript.",
          "",
          "Editorial Review Summary",
          "",
          "Our Recommendation",
          "",
          "Professional Publishing Package",
          "$4,500",
          "",
          "Another Publishing Path",
          "",
          "Starter Publishing Package at $1,999 is another publishing path you may consider.",
          "",
          "If you're ready to begin your publishing journey with J Merrill Publishing, simply reply to this email with your preferred package.",
          "",
          "As soon as we receive your confirmation, we'll prepare your Author Workspace and guide you through the next steps together.",
          "",
          "The J Merrill Publishing Team"
        ].join("\n"),
        templateName: "EDITORIAL_RECOMMENDATION_LETTER_V1",
        internalVisibilityMailbox: INTERNAL_VISIBILITY_MAILBOX
      }
    }
  };
}

describe("publisher recommendation replacement resend", () => {
  test("builds safe superseded execution-log payload", () => {
    const payload = buildRecommendationResendEventPayload({
      eventType: RESEND_EVENT.SUPERSEDED,
      diagnosticId: DIAGNOSTIC_ID,
      intakeReferenceCode: INTAKE_REFERENCE,
      subject: "Editorial Recommendation Letter for The Intentional Leader",
      approvedBy: "jackie"
    });

    assert.equal(payload.jm1_actiontype, "AUTHOR_RECOMMENDATION_SUPERSEDED");
    assert.match(payload.jm1_actiondescription, /Workflow remains Awaiting Author Response/);
    assert.match(payload.jm1_actiondescription, /No package recommendation change/);
    assert.equal(/secret|token|header|prompt body|manuscript text/i.test(payload.jm1_actiondescription), true);
  });

  test("sends exactly one Editorial Recommendation Letter replacement and logs superseded plus replacement events", async () => {
    const events = [];
    const sends = [];
    const sendLogs = [];

    const result = await runPublisherRecommendationAction({
      diagnosticId: DIAGNOSTIC_ID,
      intakeReferenceCode: INTAKE_REFERENCE,
      action: ACTION.RESEND_EDITORIAL_RECOMMENDATION_LETTER,
      approvedBy: "jackie",
      confirmAction: true,
      confirmSend: true
    }, {
      prepareDraft: async () => draftResult(),
      sendResponse: async ({ input }) => {
        sends.push(input.sendApproval);
        return {
          ok: true,
          deliveryStatus: "AUTHOR_RESPONSE_SENT",
          internalVisibilityStatus: "INTERNAL_VISIBILITY_SATISFIED",
          providerName: "acs-relay",
          providerMessageId: "message-id"
        };
      },
      persistSendLog: async (input) => {
        sendLogs.push(input);
        return { ok: true, dataverseSendLogStatus: "DATAVERSE_SEND_LOG_CREATED" };
      },
      persistResendEvent: async (input) => {
        events.push(input.eventType);
        return { ok: true, id: `${input.eventType}-id` };
      }
    });

    assert.equal(result.ok, true);
    assert.equal(result.code, "PUBLISHER_RECOMMENDATION_REPLACEMENT_SENT");
    assert.equal(result.workflowStatus, "Awaiting Author Response");
    assert.equal(result.authorRecommendationSent, true);
    assert.deepEqual(events, [
      "AUTHOR_RECOMMENDATION_SUPERSEDED",
      "EDITORIAL_RECOMMENDATION_LETTER_REPLACEMENT_SENT"
    ]);
    assert.equal(sends.length, 1);
    assert.equal(sendLogs.length, 1);
    assert.equal(sends[0].templateName, "EDITORIAL_RECOMMENDATION_LETTER_V1");
    assert.match(sends[0].draftBody, /Editorial Recommendation Letter/);
    assert.match(sends[0].draftBody, /Before we ever ask an author to invest in us/);
    assert.equal(sends[0].draftBody.includes("JMP-PKG-"), false);
    assert.equal(/Stripe|payment link|invoice|credit card|SignNow|workspace access code/i.test(sends[0].draftBody), false);
  });
});
