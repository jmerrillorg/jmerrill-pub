"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  ACTION,
  RESEND_EVENT,
  runPublisherRecommendationAction,
  buildRecommendationResendEventPayload,
  buildPostSendStatePatch,
  buildAwaitingAuthorResponsePatch
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
        subject: "Your Editorial Review & Publishing Recommendation | J Merrill Publishing",
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
          "Reply with the package you would like to select, or send us any questions you want answered before choosing.",
          "",
          "The J Merrill Publishing Team"
        ].join("\n"),
        htmlBody: "<!doctype html><html><body><table><tr><td>J MERRILL PUBLISHING</td></tr></table></body></html>",
        templateVersion: "1.1.0",
        htmlChecksum: "a".repeat(64),
        textChecksum: "b".repeat(64),
        qualityGate: "PASS",
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
    assert.match(payload.jm1_actiondescription, /LifecycleContext=PROSPECT_INQUIRY/);
    assert.match(payload.jm1_actiondescription, /DecisionType=PROSPECT_PACKAGE_SELECTION/);
    assert.match(payload.jm1_actiondescription, /Workflow remains Waiting On Prospect Package Selection/);
    assert.match(payload.jm1_actiondescription, /No package recommendation change/);
    assert.equal(/secret|token|header|prompt body|manuscript text/i.test(payload.jm1_actiondescription), true);
  });

  test("builds durable prospect package-selection state after prospect recommendation send", () => {
    const patch = buildPostSendStatePatch({
      sentAt: "2026-08-12T10:35:08Z",
      lifecycleContext: "PROSPECT_INQUIRY"
    });
    assert.equal(patch.jm1_authordraftsendstatus, "AUTHOR_RESPONSE_SENT");
    assert.match(patch.jm1_authordraftapprovalnotes, /LifecycleContext=PROSPECT_INQUIRY/);
    assert.match(patch.jm1_authordraftapprovalnotes, /WaitingOwner=Prospect/);
    assert.match(patch.jm1_authordraftapprovalnotes, /DecisionType=PROSPECT_PACKAGE_SELECTION/);
    assert.match(patch.jm1_authordraftapprovalnotes, /Waiting On Prospect Package Selection/);
    assert.doesNotMatch(patch.jm1_authordraftapprovalnotes, /Awaiting Author Response/);
    assert.match(patch.jm1_authordraftapprovalnotes, /2026-08-12T10:35:08Z/);
  });

  test("retains durable active-author editorial approval state for active contracted author sends", () => {
    const patch = buildAwaitingAuthorResponsePatch({ sentAt: "2026-08-12T10:35:08Z" });
    assert.equal(patch.jm1_authordraftsendstatus, "AUTHOR_RESPONSE_SENT");
    assert.match(patch.jm1_authordraftapprovalnotes, /LifecycleContext=ACTIVE_CONTRACTED_AUTHOR/);
    assert.match(patch.jm1_authordraftapprovalnotes, /WaitingOwner=Author/);
    assert.match(patch.jm1_authordraftapprovalnotes, /DecisionType=EDITORIAL_STAGE_APPROVAL/);
    assert.match(patch.jm1_authordraftapprovalnotes, /Workflow remains Awaiting Author Response/);
  });

  test("sends exactly one Editorial Recommendation Letter replacement and logs superseded plus replacement events", async () => {
    const events = [];
    const sends = [];
    const sendLogs = [];
    const awaitingWrites = [];

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
      },
      persistPostSendState: async (input) => {
        awaitingWrites.push(input);
        return { dataverseRecordId: input.diagnosticId };
      }
    });

    assert.equal(result.ok, true);
    assert.equal(result.code, "PUBLISHER_RECOMMENDATION_REPLACEMENT_SENT");
    assert.equal(result.lifecycleContext, "PROSPECT_INQUIRY");
    assert.equal(result.waitingOwner, "Prospect");
    assert.equal(result.decisionType, "PROSPECT_PACKAGE_SELECTION");
    assert.equal(result.responseClockDecisionType, "PROSPECT_PACKAGE_SELECTION");
    assert.equal(result.workflowStatus, "Waiting On Prospect Package Selection");
    assert.equal(result.authorRecommendationSent, true);
    assert.deepEqual(events, [
      "AUTHOR_RECOMMENDATION_SUPERSEDED",
      "EDITORIAL_RECOMMENDATION_LETTER_REPLACEMENT_SENT"
    ]);
    assert.equal(sends.length, 1);
    assert.equal(sendLogs.length, 1);
    assert.equal(awaitingWrites.length, 1);
    assert.equal(awaitingWrites[0].diagnosticId, DIAGNOSTIC_ID);
    assert.equal(awaitingWrites[0].lifecycleContext, "PROSPECT_INQUIRY");
    assert.equal(result.postSendStateStatus, "PERSISTED");
    assert.equal(sends[0].templateName, "EDITORIAL_RECOMMENDATION_LETTER_V1");
    assert.equal(sends[0].templateVersion, "1.1.0");
    assert.equal(sends[0].lifecycleContext, "PROSPECT_INQUIRY");
    assert.equal(sends[0].waitingOwner, "Prospect");
    assert.equal(sends[0].decisionType, "PROSPECT_PACKAGE_SELECTION");
    assert.equal(sends[0].responseClockDecisionType, "PROSPECT_PACKAGE_SELECTION");
    assert.match(sends[0].draftHtmlBody, /J MERRILL PUBLISHING/);
    assert.equal(sends[0].templateMetadata.htmlSha256, "a".repeat(64));
    assert.match(sends[0].draftBody, /Editorial Recommendation Letter/);
    assert.match(sends[0].draftBody, /Before we ever ask an author to invest in us/);
    assert.equal(sends[0].draftBody.includes("JMP-PKG-"), false);
    assert.equal(/Stripe|payment link|invoice|credit card|SignNow|workspace access code/i.test(sends[0].draftBody), false);
  });

  test("resend preserves active-author stage approval semantics when explicitly active", async () => {
    const awaitingWrites = [];
    const result = await runPublisherRecommendationAction({
      diagnosticId: DIAGNOSTIC_ID,
      intakeReferenceCode: INTAKE_REFERENCE,
      action: ACTION.RESEND_EDITORIAL_RECOMMENDATION_LETTER,
      approvedBy: "jackie",
      confirmAction: true,
      confirmSend: true,
      lifecycleContext: "ACTIVE_CONTRACTED_AUTHOR"
    }, {
      prepareDraft: async () => draftResult(),
      sendResponse: async ({ input }) => ({
        ok: true,
        deliveryStatus: "AUTHOR_RESPONSE_SENT",
        providerName: "acs-relay",
        providerMessageId: input.decisionType
      }),
      persistSendLog: async () => ({ ok: true, dataverseSendLogStatus: "DATAVERSE_SEND_LOG_CREATED" }),
      persistResendEvent: async (input) => ({ ok: true, id: `${input.lifecycleContext}-${input.eventType}` }),
      persistPostSendState: async (input) => {
        awaitingWrites.push(input);
        return { dataverseRecordId: input.diagnosticId };
      }
    });

    assert.equal(result.ok, true);
    assert.equal(result.lifecycleContext, "ACTIVE_CONTRACTED_AUTHOR");
    assert.equal(result.waitingOwner, "Author");
    assert.equal(result.decisionType, "EDITORIAL_STAGE_APPROVAL");
    assert.equal(result.responseClockDecisionType, "EDITORIAL_STAGE_APPROVAL");
    assert.equal(result.workflowStatus, "Awaiting Author Response");
    assert.equal(awaitingWrites[0].lifecycleContext, "ACTIVE_CONTRACTED_AUTHOR");
  });
});
