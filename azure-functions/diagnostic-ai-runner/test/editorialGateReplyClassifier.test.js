"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  classifyEditorialGateReply,
  isolateLatestEditorialReplySegment,
  EDITORIAL_GATE_REPLY_CLASSIFICATION
} = require("../src/mail/editorialGateReplyClassifier");

describe("classifyEditorialGateReply", () => {
  test("classifies the observed Copyediting reply as approved without changes", () => {
    const result = classifyEditorialGateReply([
      "I approve!",
      "",
      "From: J Merrill Publishing <publishing@jmerrill.one>",
      "Date: Thursday, July 16, 2026 at 1:18 PM",
      "Subject: Re: Volume I Copyediting Review Package - The Intentional Leader",
      "",
      "1. Approve the Volume I copyedited manuscript for proofreading.",
      "2. Approve with bounded copyediting corrections.",
      "3. Request a discussion before proofreading begins.",
      "4. Pause before making this decision."
    ].join("\n"));

    assert.equal(result.classification, EDITORIAL_GATE_REPLY_CLASSIFICATION.APPROVED_WITHOUT_CHANGES);
  });

  test("classifies approval with bounded corrections distinctly", () => {
    assert.equal(
      classifyEditorialGateReply("I approve with these two corrections.").classification,
      EDITORIAL_GATE_REPLY_CLASSIFICATION.APPROVED_WITH_CHANGES
    );
  });

  test("classifies discussion and deferred decisions without approval", () => {
    assert.equal(
      classifyEditorialGateReply("Can we schedule a discussion first?").classification,
      EDITORIAL_GATE_REPLY_CLASSIFICATION.DISCUSSION_REQUESTED
    );
    assert.equal(
      classifyEditorialGateReply("I need more time before deciding.").classification,
      EDITORIAL_GATE_REPLY_CLASSIFICATION.DECISION_DEFERRED
    );
  });

  test("fails closed when the current reply has no approval signal", () => {
    assert.equal(
      classifyEditorialGateReply("Thanks for sending this.").classification,
      EDITORIAL_GATE_REPLY_CLASSIFICATION.UNCLASSIFIED
    );
  });
});

describe("isolateLatestEditorialReplySegment", () => {
  test("strips quoted prior thread content before classification", () => {
    const body = [
      "Approved.",
      "",
      "On Thu, Jul 16, 2026 at 1:18 PM J Merrill Publishing wrote:",
      "> 1. Approve the manuscript",
      "> 4. Pause before making this decision"
    ].join("\n");

    assert.equal(isolateLatestEditorialReplySegment(body), "Approved.");
  });
});
