"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  buildWorkspaceInvitation
} = require("../src/functions/runIntentionalLeaderAuthorResponse");

describe("Intentional Leader workspace invitation", () => {
  test("includes required workspace instructions and no blocked mechanics", () => {
    const approval = buildWorkspaceInvitation({
      authorName: "Jackie Smith Jr.",
      authorEmail: "author@example.com",
      selectedPackage: {
        code: "JMP-PKG-PRO",
        name: "Professional Publishing Package",
        price: "$4,500"
      },
      temporaryAccessCode: "JMP-TEMP-TEST-1234",
      approvedBy: "Jackie Smith Jr."
    });

    assert.equal(approval.draftSubject, "Your Author Workspace is ready - The Intentional Leader");
    assert.match(approval.draftBody, /Your Author Workspace is ready\./);
    assert.match(approval.draftBody, /https:\/\/jmerrill\.pub\/author\/portal/);
    assert.match(approval.draftBody, /Temporary access code: JMP-TEMP-TEST-1234/);
    assert.match(approval.draftBody, /Please complete onboarding inside the workspace/);
    assert.equal(/Stripe|payment link|invoice link|SignNow|package table/i.test(approval.draftBody), false);
    assert.equal(approval.templateName, "AUTHOR_WORKSPACE_INVITATION_V1");
    assert.equal(approval.sendApproved, true);
  });
});
