const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadRelayModule() {
  process.env.ACS_EMAIL_SENDER = "publishing@email.jmerrill.one";
  process.env.ACS_AUTHOR_RESPONSE_EMAIL_SENDER = "publishing@email.jmerrill.one";

  const routes = {};
  const filePath = path.join(
    __dirname,
    "..",
    "src",
    "functions",
    "sendAuthorAcknowledgment.js"
  );
  const source = fs.readFileSync(filePath, "utf8");
  const sandbox = {
    module: { exports: {} },
    exports: {},
    routes,
    require: (name) => {
      if (name === "@azure/functions") {
        return {
          app: {
            http: (name, config) => {
              routes[name] = config;
            }
          }
        };
      }

      if (name === "@azure/communication-email") {
        return { EmailClient: class EmailClient {} };
      }

      if (name === "@azure/identity") {
        return { DefaultAzureCredential: class DefaultAzureCredential {} };
      }
      if (name.startsWith("../")) {
        return require(path.join(path.dirname(filePath), name));
      }

      return require(name);
    },
    process,
    Buffer
  };

  vm.runInNewContext(
    `${source}\nmodule.exports.__test = {
      routes,
      validatePayload,
      buildAcknowledgmentEmail,
      safeErrorCode,
      validateInternalNotificationPayload,
      validateJoinInternalNotificationPayload,
      validatePaymentInternalNotificationPayload,
      validateJoinedFamilyInternalNotificationPayload,
      validateApprovedAuthorResponsePayload,
      buildInternalNotificationEmail,
      buildJoinInternalNotificationEmail,
      buildPaymentInternalNotificationEmail,
      buildJoinedFamilyInternalNotificationEmail,
      buildApprovedAuthorResponseEmail,
      validatePublishingAcknowledgmentEmail,
      validateCanonicalPackageAcceptancePayload,
      milestoneValidationError,
      milestoneUnauthorized
    };`,
    sandbox,
    { filename: filePath }
  );

  return sandbox.module.exports.__test;
}

test("validates the INT-PUB-005 contract", () => {
  const { validatePayload } = loadRelayModule();

  const result = validatePayload({
    reference: "JMP-INT-202606-ABC123",
    to: "Author@example.com",
    firstName: "Jackie",
    projectTitle: "Test Book",
    intakeChannel: "INT-PUB-005 /join"
  });

  assert.equal(result.ok, true);
  assert.equal(result.value.to, "author@example.com");
});

test("rejects non-join intake channels", () => {
  const { validatePayload } = loadRelayModule();

  const result = validatePayload({
    reference: "JMP-INT-202606-ABC123",
    to: "author@example.com",
    firstName: "Jackie",
    projectTitle: "Test Book",
    intakeChannel: "other"
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, "INVALID_INTAKE_CHANNEL");
});

test("uses explicit project title fallback", () => {
  const { validatePayload, buildAcknowledgmentEmail } = loadRelayModule();

  const result = validatePayload({
    reference: "JMP-INT-202606-ABC123",
    to: "author@example.com",
    firstName: "Jackie",
    projectTitle: "",
    intakeChannel: "INT-PUB-005 /join"
  });

  assert.equal(result.ok, true);
  const email = buildAcknowledgmentEmail(result.value);
  assert.match(email.content.plainText, /your book/);
});

test("acknowledgment confirms editorial review when manuscript link is present", () => {
  const { validatePayload, buildAcknowledgmentEmail } = loadRelayModule();

  const result = validatePayload({
    reference: "JMP-INT-202606-ABC123",
    to: "author@example.com",
    firstName: "Jackie",
    projectTitle: "Test Book",
    intakeChannel: "INT-PUB-005 /join",
    manuscriptUrl: "https://example.com/manuscript.pdf"
  });

  assert.equal(result.ok, true);
  const email = buildAcknowledgmentEmail(result.value);
  assert.match(email.content.plainText, /Your manuscript is connected to your inquiry/);
  assert.match(email.content.plainText, /prepare it for the right Editorial Review step/);
  assert.doesNotMatch(email.content.plainText, /We did not receive a manuscript link/);
});

test("acknowledgment asks for manuscript file or link when missing", () => {
  const { validatePayload, buildAcknowledgmentEmail } = loadRelayModule();

  const result = validatePayload({
    reference: "JMP-INT-202606-ABC123",
    to: "author@example.com",
    firstName: "Jackie",
    projectTitle: "Test Book",
    intakeChannel: "INT-PUB-005 /join"
  });

  assert.equal(result.ok, true);
  const email = buildAcknowledgmentEmail(result.value);
  assert.match(email.content.plainText, /We do not yet have a manuscript file or shareable manuscript link/);
  assert.match(email.content.plainText, /reply to this message with the file attached or with a shareable manuscript link/);
  assert.match(email.content.plainText, /Editorial Review cannot begin until the manuscript is connected/);
  assert.doesNotMatch(email.content.plainText, /We received your manuscript link/);
});

test("acknowledgment includes Publishing mailbox CC and canonical reply-to", () => {
  const { validatePayload, buildAcknowledgmentEmail } = loadRelayModule();

  const result = validatePayload({
    reference: "JMP-INT-202606-ABC123",
    to: "author@example.com",
    firstName: "Jackie",
    projectTitle: "Test Book",
    intakeChannel: "INT-PUB-005 /join"
  });

  const email = buildAcknowledgmentEmail(result.value);
  assert.equal(email.senderAddress, "publishing@email.jmerrill.one");
  assert.equal(email.replyTo[0].address, "publishing@jmerrill.one");
  assert.equal(JSON.stringify(email.recipients.cc.map((recipient) => recipient.address)), JSON.stringify(["publishing@jmerrill.one"]));
});

test("acknowledgment uses human-first subject, branded HTML, and body reference", () => {
  const { validatePayload, buildAcknowledgmentEmail, validatePublishingAcknowledgmentEmail } = loadRelayModule();

  const result = validatePayload({
    reference: "JMP-INT-202608-OZT8IO",
    to: "author@example.com",
    firstName: "Author",
    projectTitle: "New Book Test",
    intakeChannel: "INT-PUB-005 /join",
    continuationUrl: "https://jmerrill.pub/join/continue/test-token"
  });

  assert.equal(result.ok, true);
  const email = buildAcknowledgmentEmail(result.value);
  assert.equal(email.content.subject, "We Received Your Publishing Inquiry for New Book Test");
  assert.doesNotMatch(email.content.subject, /JMP-INT-202608-OZT8IO/);
  assert.match(email.content.plainText, /JMP-INT-202608-OZT8IO/);
  assert.match(email.content.html, /J MERRILL PUBLISHING/);
  assert.match(email.content.html, /Add Your Manuscript/);
  assert.doesNotMatch(`${email.content.html}\n${email.content.plainText}`, /Author Workspace|author\/portal/i);
  assert.equal(validatePublishingAcknowledgmentEmail(email, result.value).ok, true);
});

const diagnosticId = "64e387e0-7e6a-f111-a826-00224820105b";
const intakeReferenceCode = "JMP-INT-202606-UFYG60";

function validInternalPayload(overrides = {}) {
  return {
    notificationType: "AUTHOR_DRAFT_READY_FOR_REVIEW",
    diagnosticId,
    intakeReferenceCode,
    authorName: "Jackie",
    authorEmail: "author@example.com",
    projectTitle: "Test Book",
    draftStatus: "DRAFT_ONLY",
    approvalStatus: "PENDING_HUMAN_APPROVAL",
    draftPreview: "Safe draft preview for internal review.",
    nextAction: "Review author-response draft",
    recipient: "publishing@jmerrill.one",
    ...overrides
  };
}

function validAuthorResponsePayload(overrides = {}) {
  return {
    messageType: "APPROVED_AUTHOR_RESPONSE",
    diagnosticId,
    intakeReferenceCode,
    authorEmail: "author@example.com",
    authorName: "Jackie",
    projectTitle: "Test Book",
    subject: "Next step for your J Merrill Publishing submission",
    body: "Approved author response body.",
    templateName: "INITIAL_DIAGNOSTIC_REVIEW_NEXT_STEP",
    approvedBy: "jackie",
    approvedOn: "2026-06-18T12:00:00.000Z",
    internalVisibilityMailbox: "publishing@jmerrill.one",
    futureSendRequiresInternalCopy: true,
    futureSendRequiresDataverseLog: true,
    ...overrides
  };
}

function validEditorialRecommendationPayload(overrides = {}) {
  return validAuthorResponsePayload({
    subject: "Your Editorial Review & Publishing Recommendation | J Merrill Publishing",
    body: "J MERRILL PUBLISHING\nEditorial Review & Publishing Recommendation\n\nPlain-text fallback.",
    htmlBody: "<!doctype html><html><body><table><tr><td>J MERRILL PUBLISHING</td></tr></table></body></html>",
    templateName: "EDITORIAL_RECOMMENDATION_LETTER_V1",
    templateVersion: "1.1.0",
    templateMetadata: {
      htmlSha256: "a".repeat(64),
      textSha256: "b".repeat(64),
      qualityGate: "PASS"
    },
    ...overrides
  });
}

function validAuthorReviewPackagePayload(overrides = {}) {
  const canonicalHtml = `<!doctype html>
<html lang="en">
  <body>
    <table role="presentation"><tr><td>J MERRILL PUBLISHING</td></tr></table>
    <p>A Division of J Merrill One</p>
    <p>Helping Authors Help Themselves.</p>
    <h1>Cover Design Review</h1>
    <h2>Why you are receiving this</h2>
    <p>Your cover design review package is ready.</p>
    <h2>What has been completed</h2>
    <ul><li>The Publishing Team prepared the current author-facing files.</li></ul>
    <h2>What's attached</h2>
    <ul><li>Cover concept image.</li></ul>
    <h2>What we need from you</h2>
    <p>Please review the package.</p>
    <h2>How to respond</h2>
    <p>Reply directly to publishing@jmerrill.one.</p>
    <a href="https://jmerrill.pub/author/portal?action=review-package" style="display:inline-block;background:#1D4ED8;color:#ffffff;">View in Author Operating Center</a>
    <h2>What happens next</h2>
    <p>The Publishing Team records your response.</p>
    <h2>Support</h2>
    <p>Reply to this email and the Publishing Team will help.</p>
    <p>The Publishing Team</p>
  </body>
</html>`;
  return validAuthorResponsePayload({
    subject: "Developmental Editing Review Package - Before You Were Born",
    body: [
      "Good day, Author,",
      "",
      "Why you are receiving this",
      "Your package is ready.",
      "",
      "What has been completed",
      "- The Publishing Team prepared the current author-facing files.",
      "",
      "What's attached",
      "- Current author-review manuscript",
      "",
      "What we need from you",
      "Please review the package.",
      "",
      "How to respond",
      "Reply directly to publishing@jmerrill.one.",
      "",
      "Optional Author Operating Center access: https://jmerrill.pub/author/portal?action=review-package",
      "",
      "What happens next",
      "- The Publishing Team records your response.",
      "",
      "Support",
      "Reply to this email and the Publishing Team will help.",
      "",
      "The Publishing Team"
    ].join("\n"),
    htmlBody: canonicalHtml,
    templateName: "AUTHOR_REVIEW_PACKAGE_NOTIFICATION_V1",
    templateVersion: "1.0.0",
    templateMetadata: {
      htmlSha256: "c".repeat(64),
      textSha256: "d".repeat(64),
      qualityGate: "PASS",
      brandSystem: "JM1_AUTHOR_COMMUNICATION",
      enterpriseStandard: "JM1 Enterprise Communication Standard v1.0",
      renderer: "JM1 Enterprise Communication Renderer",
      rendererVersion: "1.0.0",
      renderMode: "CANONICAL_HTML",
      renderTemplateGuard: "PASS"
    },
    attachments: [
      {
        name: "Before You Were Born - Developmental Summary.pdf",
        contentType: "application/pdf",
        contentInBase64: Buffer.from("author-safe summary").toString("base64")
      }
    ],
    ...overrides
  });
}

function validFinalDevelopmentalReviewPayload(overrides = {}) {
  const canonicalHtml = `<!doctype html>
<html lang="en">
  <body>
    <table role="presentation"><tr><td>J MERRILL PUBLISHING</td></tr></table>
    <p>A Division of J Merrill One</p>
    <p>Helping Authors Help Themselves.</p>
    <h1>Final Developmental Review</h1>
    <h2>Why you are receiving this</h2>
    <p>The Publishing Team has incorporated the revisions requested during developmental editing.</p>
    <h2>What has been completed</h2>
    <ul><li>The Publishing Team verified the revised manuscript.</li></ul>
    <h2>What's attached</h2>
    <ul><li>The revised developmental-edit manuscript.</li></ul>
    <h2>What we need from you</h2>
    <p>Please review the attached manuscript and reply with Approved or Changes still required.</p>
    <h2>How to respond</h2>
    <p>Reply to this email with Approved or Changes still required.</p>
    <h2>What happens next</h2>
    <p>The Publishing Team records your response.</p>
    <h2>Support</h2>
    <p>Reply to this email and the Publishing Team will help.</p>
    <p>The Publishing Team</p>
  </body>
</html>`;
  return validAuthorResponsePayload({
    subject: "Final Developmental Review - The General’s Will and Last Testament",
    body: [
      "Good day, Iyorwuese,",
      "",
      "Why you are receiving this",
      "The Publishing Team has incorporated the revisions requested during developmental editing.",
      "",
      "What has been completed",
      "- The Publishing Team verified the revised manuscript.",
      "",
      "What's attached",
      "- The revised developmental-edit manuscript.",
      "",
      "What we need from you",
      "Please review the attached manuscript and reply with Approved or Changes still required.",
      "",
      "How to respond",
      "Reply to this email with Approved or Changes still required.",
      "",
      "What happens next",
      "- The Publishing Team records your response.",
      "",
      "Support",
      "Reply to this email and the Publishing Team will help.",
      "",
      "The Publishing Team"
    ].join("\n"),
    htmlBody: canonicalHtml,
    templateName: "AUTHOR_FINAL_DEVELOPMENTAL_REVIEW_V1",
    templateVersion: "1.0.0",
    templateMetadata: {
      htmlSha256: "e".repeat(64),
      textSha256: "f".repeat(64),
      qualityGate: "PASS",
      brandSystem: "JM1_AUTHOR_COMMUNICATION",
      enterpriseStandard: "JM1 Enterprise Communication Standard v1.0",
      renderer: "JM1 Enterprise Communication Renderer",
      rendererVersion: "1.0.0",
      renderMode: "CANONICAL_HTML",
      renderTemplateGuard: "PASS"
    },
    attachments: [
      {
        name: "The General’s Will and Last Testament - Editorial Working Version - Jackie Restoration.docx",
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        contentInBase64: Buffer.from("author-safe revised manuscript").toString("base64")
      }
    ],
    ...overrides
  });
}

function validJoinInternalPayload(overrides = {}) {
  return {
    notificationType: "JOIN_INTAKE_RECEIVED",
    reference: "JMP-INT-202607-DL2T20",
    authorName: "Iyorwuese Hagher",
    authorEmail: "hagher.hagher@example.com",
    phone: "9376207856",
    projectTitle: "The General's Will and Last Testament",
    manuscriptType: "Full-length Book",
    manuscriptStatus: "Complete",
    intakeChannel: "INT-PUB-005 /join",
    sharePointWorkspaceUrl: "https://jmerrillfoundation.sharepoint.com/sites/publishing/Shared%20Documents/01_Pre-Pipeline/00_Inquiry/example",
    dataverseIntakeUrl: "https://jm1hq.crm.dynamics.com/main.aspx?pagetype=entityrecord&etn=jm1_publishingintake&id=49bb8498-5d75-f111-ab0f-7c1e525b15c2",
    leadUrl: "https://jm1hq.crm.dynamics.com/main.aspx?pagetype=entityrecord&etn=lead&id=40e24584-6675-f111-ab0f-7c1e525b15c2",
    contactUrl: "https://jm1hq.crm.dynamics.com/main.aspx?pagetype=entityrecord&etn=contact&id=c8c8747e-6675-f111-ab0f-6045bdd69678",
    stageStatus: "Intake received",
    nextAction: "Review the intake and confirm routing/workspace completion.",
    recipient: "publishing@jmerrill.one",
    ...overrides
  };
}

function validPaymentInternalPayload(overrides = {}) {
  return {
    notificationType: "PUBLISHING_PAYMENT_RECEIVED",
    recipient: "publishing@jmerrill.one",
    authorName: "Atta Darko",
    projectTitle: "Untitled",
    opportunityId: "131da28b-919c-f111-b8dc-6045bdd69435",
    packageCode: "JMP-PKG-STARTER",
    paymentOption: "EIGHT_PAYMENTS",
    installmentCount: 8,
    amountPaid: "$259.88",
    paymentTimestamp: "2026-08-21T16:35:16.000Z",
    paymentIntentId: "pi_3U6UygJCiOVFpgYu1V9iO8xW",
    chargeId: "py_3U6UygJCiOVFpgYu16C8l9aL",
    invoiceId: "in_1U6UvvJCiOVFpgYubDg2z1e9",
    invoiceNumber: "9P5TH1BQ-0001",
    customerId: "cus_V6iLQUvk68RyJB",
    subscriptionId: "sub_1U6UvvJCiOVFpgYuwpqG6sFe",
    subscriptionScheduleId: "sub_sched_1U6UvvJCiOVFpgYuik8ptyYp",
    joinedFamilyState: "BLOCKED_AGREEMENT_NOT_EXECUTED",
    actionRequired: "Confirm agreement execution before Joined the Family is set.",
    noAuthorCommunication: true,
    ...overrides
  };
}

function validJoinedFamilyInternalPayload(overrides = {}) {
  return {
    notificationType: "PUBLISHING_JOINED_THE_FAMILY",
    recipient: "publishing@jmerrill.one",
    authorName: "Atta Boateng",
    projectTitle: "Untitled",
    opportunityId: "131da28b-919c-f111-b8dc-6045bdd69435",
    packageCode: "JMP-PKG-STARTER",
    paymentOption: "EIGHT_PAYMENTS",
    paymentPolicy: "JMP_MULTIPAY_TRANSACTION_FEE_4_PERCENT_v1.0",
    paymentStatus: "1 of 8 paid",
    paymentsRemaining: 7,
    agreementExecutedOn: "2026-08-19T15:42:58.000Z",
    initialPaymentReceivedOn: "2026-08-21T16:35:16.000Z",
    joinedTheFamilyOn: "2026-08-21T16:35:16.000Z",
    workspaceStatus: "Active",
    onboardingStatus: "Started; required details remain incomplete",
    productionAuthorization: "Commercial production authorization confirmed",
    finalDeliveryGate: "Closed until remaining payment obligation is complete",
    nextAction: "Complete onboarding readiness review.",
    noAuthorCommunication: true,
    ...overrides
  };
}

function assertRejected(result, reason) {
  assert.equal(result.ok, false);
  assert.equal(result.reason, reason);
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes("SECRET"), false);
  assert.equal(serialized.includes("MANUSCRIPT"), false);
  assert.equal(serialized.includes("PROMPT"), false);
}

test("valid internal notification builds ACS email to publishing@jmerrill.one", () => {
  const { validateInternalNotificationPayload, buildInternalNotificationEmail } = loadRelayModule();
  const result = validateInternalNotificationPayload(validInternalPayload());

  assert.equal(result.ok, true);
  const email = buildInternalNotificationEmail(result.value);
  assert.equal(email.senderAddress, "publishing@email.jmerrill.one");
  assert.equal(JSON.stringify(email.recipients.to.map((recipient) => recipient.address)), JSON.stringify(["publishing@jmerrill.one"]));
  assert.equal(Object.hasOwn(email.recipients, "cc"), false);
  assert.equal(Object.hasOwn(email.recipients, "bcc"), false);
  assert.match(email.content.subject, /JMP-INT-202606-UFYG60/);
  assert.match(email.content.plainText, /No author email has been sent\./);
  assert.equal(JSON.stringify(email.recipients).includes("author@example.com"), false);
});

test("valid /join internal notification builds ACS email to publishing@jmerrill.one", () => {
  const { validateJoinInternalNotificationPayload, buildJoinInternalNotificationEmail } = loadRelayModule();
  const result = validateJoinInternalNotificationPayload(validJoinInternalPayload());

  assert.equal(result.ok, true);
  const email = buildJoinInternalNotificationEmail(result.value);
  assert.equal(email.senderAddress, "publishing@email.jmerrill.one");
  assert.equal(JSON.stringify(email.recipients.to.map((recipient) => recipient.address)), JSON.stringify(["publishing@jmerrill.one"]));
  assert.equal(Object.hasOwn(email.recipients, "cc"), false);
  assert.equal(Object.hasOwn(email.recipients, "bcc"), false);
  assert.match(email.content.subject, /JMP-INT-202607-DL2T20/);
  assert.match(email.content.plainText, /new \/join publishing inquiry/i);
  assert.match(email.content.plainText, /SharePoint Workspace:/);
  assert.match(email.content.plainText, /Dataverse Intake:/);
  assert.match(email.content.plainText, /No author-facing message was sent/);
  assert.equal(JSON.stringify(email.recipients).includes("hagher.hagher@example.com"), false);
});

test("valid Publishing payment internal notification builds ACS email to publishing@jmerrill.one", () => {
  const { validatePaymentInternalNotificationPayload, buildPaymentInternalNotificationEmail } = loadRelayModule();
  const result = validatePaymentInternalNotificationPayload(validPaymentInternalPayload());

  assert.equal(result.ok, true);
  const email = buildPaymentInternalNotificationEmail(result.value);
  assert.equal(email.senderAddress, "publishing@email.jmerrill.one");
  assert.equal(JSON.stringify(email.recipients.to.map((recipient) => recipient.address)), JSON.stringify(["publishing@jmerrill.one"]));
  assert.equal(Object.hasOwn(email.recipients, "cc"), false);
  assert.equal(Object.hasOwn(email.recipients, "bcc"), false);
  assert.match(email.content.subject, /Publishing Payment Received - Atta Darko - \$259\.88/);
  assert.match(email.content.plainText, /A Publishing payment was received and reconciled/);
  assert.match(email.content.plainText, /No author-facing message was sent/);
});

test("Publishing payment internal notification rejects wrong recipient and missing no-author-communication confirmation", () => {
  const { validatePaymentInternalNotificationPayload } = loadRelayModule();

  assertRejected(
    validatePaymentInternalNotificationPayload(validPaymentInternalPayload({ recipient: "ops@jmerrill.one" })),
    "RECIPIENT_INVALID"
  );
  assertRejected(
    validatePaymentInternalNotificationPayload(validPaymentInternalPayload({ to: ["author@example.com"] })),
    "RECIPIENT_INVALID"
  );
  assertRejected(
    validatePaymentInternalNotificationPayload(validPaymentInternalPayload({ noAuthorCommunication: false })),
    "NO_AUTHOR_COMMUNICATION_CONFIRMATION_REQUIRED"
  );
});

test("valid Publishing joined-family internal notification builds separate ACS email to publishing@jmerrill.one", () => {
  const { validateJoinedFamilyInternalNotificationPayload, buildJoinedFamilyInternalNotificationEmail } = loadRelayModule();
  const result = validateJoinedFamilyInternalNotificationPayload(validJoinedFamilyInternalPayload());

  assert.equal(result.ok, true);
  const email = buildJoinedFamilyInternalNotificationEmail(result.value);
  assert.equal(email.senderAddress, "publishing@email.jmerrill.one");
  assert.equal(JSON.stringify(email.recipients.to.map((recipient) => recipient.address)), JSON.stringify(["publishing@jmerrill.one"]));
  assert.equal(Object.hasOwn(email.recipients, "cc"), false);
  assert.equal(Object.hasOwn(email.recipients, "bcc"), false);
  assert.match(email.content.subject, /Joined the Family - Atta Boateng - Untitled/);
  assert.match(email.content.plainText, /has joined the J Merrill Publishing family/);
  assert.match(email.content.plainText, /No author-facing message was sent/);
  assert.doesNotMatch(email.content.subject, /Payment Received/);
});

test("Publishing joined-family internal notification rejects wrong recipient and duplicate author send risk", () => {
  const { validateJoinedFamilyInternalNotificationPayload } = loadRelayModule();

  assertRejected(
    validateJoinedFamilyInternalNotificationPayload(validJoinedFamilyInternalPayload({ recipient: "ops@jmerrill.one" })),
    "RECIPIENT_INVALID"
  );
  assertRejected(
    validateJoinedFamilyInternalNotificationPayload(validJoinedFamilyInternalPayload({ to: ["author@example.com"] })),
    "RECIPIENT_INVALID"
  );
  assertRejected(
    validateJoinedFamilyInternalNotificationPayload(validJoinedFamilyInternalPayload({ noAuthorCommunication: false })),
    "NO_AUTHOR_COMMUNICATION_CONFIRMATION_REQUIRED"
  );
});

test("/join internal notification rejects wrong recipient, author recipient, and unsafe fields", () => {
  const { validateJoinInternalNotificationPayload } = loadRelayModule();

  assertRejected(
    validateJoinInternalNotificationPayload(validJoinInternalPayload({ recipient: "ops@jmerrill.one" })),
    "RECIPIENT_INVALID"
  );
  assertRejected(
    validateJoinInternalNotificationPayload(validJoinInternalPayload({ to: ["hagher.hagher@example.com"] })),
    "RECIPIENT_INVALID"
  );
  assertRejected(
    validateJoinInternalNotificationPayload(validJoinInternalPayload({ cc: ["publishing@jmerrill.one"] })),
    "CC_BCC_NOT_ALLOWED"
  );
  assertRejected(
    validateJoinInternalNotificationPayload(validJoinInternalPayload({ manuscriptText: "SECRET MANUSCRIPT" })),
    "UNSAFE_FIELD_PRESENT"
  );
});

test("internal notification rejects wrong type and wrong recipient", () => {
  const { validateInternalNotificationPayload } = loadRelayModule();

  assertRejected(
    validateInternalNotificationPayload(validInternalPayload({ notificationType: "OTHER" })),
    "NOTIFICATION_TYPE_INVALID"
  );
  assertRejected(
    validateInternalNotificationPayload(validInternalPayload({ recipient: "ops@jmerrill.one" })),
    "RECIPIENT_INVALID"
  );
});

test("internal notification rejects author in To, CC, or BCC", () => {
  const { validateInternalNotificationPayload } = loadRelayModule();

  for (const field of ["to", "cc", "bcc"]) {
    assertRejected(
      validateInternalNotificationPayload(validInternalPayload({ [field]: ["author@example.com"] })),
      "AUTHOR_RECIPIENT_BLOCKED"
    );
  }
});

test("internal notification rejects CC/BCC, @jmerrill.pub, missing preview, and unsafe fields", () => {
  const { validateInternalNotificationPayload } = loadRelayModule();

  assertRejected(validateInternalNotificationPayload(validInternalPayload({ cc: ["publishing@jmerrill.one"] })), "CC_BCC_NOT_ALLOWED");
  assertRejected(validateInternalNotificationPayload(validInternalPayload({ recipient: "publishing@jmerrill.pub" })), "RECIPIENT_INVALID");
  assertRejected(validateInternalNotificationPayload(validInternalPayload({ draftPreview: "" })), "DRAFT_PREVIEW_MISSING");

  for (const unsafe of [
    { manuscriptText: "SECRET MANUSCRIPT" },
    { promptBody: "SECRET PROMPT" },
    { rawModelResponse: "SECRET RAW" },
    { opportunityPayload: "SECRET" },
    { flowDTrigger: true },
    { headers: { authorization: "Bearer SECRET" } },
    { apiKey: "SECRET" },
    { token: "SECRET" }
  ]) {
    assertRejected(validateInternalNotificationPayload(validInternalPayload(unsafe)), "UNSAFE_FIELD_PRESENT");
  }
});

test("valid approved author response builds ACS email to author and Publishing mailbox CC", () => {
  const { validateApprovedAuthorResponsePayload, buildApprovedAuthorResponseEmail } = loadRelayModule();
  const result = validateApprovedAuthorResponsePayload(validAuthorResponsePayload());

  assert.equal(result.ok, true);
  const email = buildApprovedAuthorResponseEmail(result.value);
  assert.equal(email.senderAddress, "publishing@email.jmerrill.one");
  assert.equal(JSON.stringify(email.recipients.to.map((recipient) => recipient.address)), JSON.stringify(["author@example.com"]));
  assert.equal(JSON.stringify(email.recipients.cc.map((recipient) => recipient.address)), JSON.stringify(["publishing@jmerrill.one"]));
  assert.equal(Object.hasOwn(email.recipients, "bcc"), false);
  assert.equal(email.content.subject, "Next step for your J Merrill Publishing submission");
});

test("approved author response sets Reply-To to publishing@jmerrill.one (captures plain Reply, not just Reply All)", () => {
  const { validateApprovedAuthorResponsePayload, buildApprovedAuthorResponseEmail } = loadRelayModule();
  const result = validateApprovedAuthorResponsePayload(validAuthorResponsePayload());

  const email = buildApprovedAuthorResponseEmail(result.value);
  assert.ok(Array.isArray(email.replyTo));
  assert.equal(email.replyTo.length, 1);
  assert.equal(email.replyTo[0].address, "publishing@jmerrill.one");
  assert.equal(email.replyTo[0].displayName, "J Merrill Publishing");
});

test("approved author response sender address is publishing@email.jmerrill.one", () => {
  const { validateApprovedAuthorResponsePayload, buildApprovedAuthorResponseEmail } = loadRelayModule();
  const result = validateApprovedAuthorResponsePayload(validAuthorResponsePayload());

  const email = buildApprovedAuthorResponseEmail(result.value);
  assert.equal(email.senderAddress, "publishing@email.jmerrill.one");
});

test("approved author response sender is never @jmerrill.pub or DoNotReply", () => {
  const { validateApprovedAuthorResponsePayload, buildApprovedAuthorResponseEmail } = loadRelayModule();
  const result = validateApprovedAuthorResponsePayload(validAuthorResponsePayload());

  const email = buildApprovedAuthorResponseEmail(result.value);
  assert.ok(!email.senderAddress.toLowerCase().endsWith("@jmerrill.pub"));
  assert.notEqual(email.senderAddress, "DoNotReply@email.jmerrill.one");
});

test("approved author response Reply-To is never the author's own address", () => {
  const { validateApprovedAuthorResponsePayload, buildApprovedAuthorResponseEmail } = loadRelayModule();
  const result = validateApprovedAuthorResponsePayload(validAuthorResponsePayload());

  const email = buildApprovedAuthorResponseEmail(result.value);
  assert.notEqual(email.replyTo[0].address, "author@example.com");
});

test("approved author response Reply-To is never a @jmerrill.pub address", () => {
  const { validateApprovedAuthorResponsePayload, buildApprovedAuthorResponseEmail } = loadRelayModule();
  const result = validateApprovedAuthorResponsePayload(validAuthorResponsePayload());

  const email = buildApprovedAuthorResponseEmail(result.value);
  assert.ok(!email.replyTo[0].address.toLowerCase().endsWith("@jmerrill.pub"));
});

test("approved author response injects Publishing CC, dedupes case variants, and rejects unapproved CC", () => {
  const { validateApprovedAuthorResponsePayload } = loadRelayModule();

  assertRejected(validateApprovedAuthorResponsePayload(validAuthorResponsePayload({ authorEmail: "" })), "AUTHOR_EMAIL_INVALID");
  assertRejected(validateApprovedAuthorResponsePayload(validAuthorResponsePayload({ to: "other@example.com" })), "AUTHOR_RECIPIENT_INVALID");
  const injected = validateApprovedAuthorResponsePayload(validAuthorResponsePayload({ cc: [] }));
  assert.equal(injected.ok, true);
  assert.equal(JSON.stringify(injected.value.cc), JSON.stringify(["publishing@jmerrill.one"]));
  const deduped = validateApprovedAuthorResponsePayload(validAuthorResponsePayload({ cc: ["Publishing@JMERRILL.ONE", "publishing@jmerrill.one"] }));
  assert.equal(deduped.ok, true);
  assert.equal(JSON.stringify(deduped.value.cc), JSON.stringify(["publishing@jmerrill.one"]));
  assertRejected(validateApprovedAuthorResponsePayload(validAuthorResponsePayload({ cc: ["audit@example.com"] })), "UNAPPROVED_CC_RECIPIENT_PRESENT");
  assertRejected(validateApprovedAuthorResponsePayload(validAuthorResponsePayload({ bcc: ["audit@example.com"] })), "UNAPPROVED_BCC_RECIPIENT_PRESENT");
});

test("approved author response rejects @jmerrill.pub, missing approval fields, subject/body, and log requirement", () => {
  const { validateApprovedAuthorResponsePayload } = loadRelayModule();

  assertRejected(validateApprovedAuthorResponsePayload(validAuthorResponsePayload({ authorEmail: "author@jmerrill.pub" })), "JMERRILL_PUB_MAILBOX_NOT_ALLOWED");
  assertRejected(validateApprovedAuthorResponsePayload(validAuthorResponsePayload({ approvedBy: "" })), "APPROVED_BY_MISSING");
  assertRejected(validateApprovedAuthorResponsePayload(validAuthorResponsePayload({ approvedOn: "" })), "APPROVED_ON_MISSING");
  assertRejected(validateApprovedAuthorResponsePayload(validAuthorResponsePayload({ subject: "" })), "SUBJECT_MISSING");
  assertRejected(validateApprovedAuthorResponsePayload(validAuthorResponsePayload({ body: "" })), "BODY_MISSING");
  assertRejected(validateApprovedAuthorResponsePayload(validAuthorResponsePayload({ futureSendRequiresDataverseLog: false })), "FUTURE_DATAVERSE_SEND_LOG_REQUIRED");
});

test("approved author response rejects unsafe fields and returns safe failure only", () => {
  const { validateApprovedAuthorResponsePayload, milestoneValidationError } = loadRelayModule();

  for (const unsafe of [
    { manuscriptText: "SECRET MANUSCRIPT" },
    { promptBody: "SECRET PROMPT" },
    { rawModelResponse: "SECRET RAW" },
    { opportunityPayload: "SECRET" },
    { flowDTrigger: true },
    { headers: { authorization: "Bearer SECRET" } },
    { apiKey: "SECRET" },
    { token: "SECRET" }
  ]) {
    assertRejected(validateApprovedAuthorResponsePayload(validAuthorResponsePayload(unsafe)), "UNSAFE_FIELD_PRESENT");
  }

  const response = milestoneValidationError("UNSAFE_FIELD_PRESENT", validAuthorResponsePayload({ body: "SECRET BODY" }));
  const serialized = JSON.stringify(response);
  assert.equal(response.jsonBody.accepted, false);
  assert.equal(response.jsonBody.code, "ACS_RELAY_VALIDATION_FAILED");
  assert.equal(serialized.includes("SECRET BODY"), false);
});

test("approved author-review package rejects missing attachments", () => {
  const { validateApprovedAuthorResponsePayload } = loadRelayModule();

  assertRejected(
    validateApprovedAuthorResponsePayload(validAuthorReviewPackagePayload({ attachments: [] })),
    "AUTHOR_REVIEW_ATTACHMENTS_MISSING"
  );
});

test("approved author-review package rejects noncanonical HTML even when HTML exists", () => {
  const { validateApprovedAuthorResponsePayload } = loadRelayModule();

  assertRejected(
    validateApprovedAuthorResponsePayload(validAuthorReviewPackagePayload({
      htmlBody: "<!doctype html><html><body><table><tr><td>J MERRILL PUBLISHING</td></tr></table><p>Simple package notice.</p></body></html>"
    })),
    "AUTHOR_REVIEW_PACKAGE_CANONICAL_STRUCTURE_REQUIRED"
  );
});

test("approved author-review package rejects missing canonical renderer metadata", () => {
  const { validateApprovedAuthorResponsePayload } = loadRelayModule();

  assertRejected(
    validateApprovedAuthorResponsePayload(validAuthorReviewPackagePayload({
      templateMetadata: {
        htmlSha256: "c".repeat(64),
        textSha256: "d".repeat(64),
        qualityGate: "PASS"
      }
    })),
    "AUTHOR_REVIEW_PACKAGE_CANONICAL_RENDER_MODE_REQUIRED"
  );
});

test("approved author-review package sends validated attachments to ACS", () => {
  const { validateApprovedAuthorResponsePayload, buildApprovedAuthorResponseEmail } = loadRelayModule();
  const result = validateApprovedAuthorResponsePayload(validAuthorReviewPackagePayload());

  assert.equal(result.ok, true);
  const email = buildApprovedAuthorResponseEmail(result.value);
  assert.equal(email.content.html.includes("J MERRILL PUBLISHING"), true);
  assert.equal(email.attachments.length, 1);
  assert.equal(email.attachments[0].name, "Before You Were Born - Developmental Summary.pdf");
  assert.equal(email.attachments[0].contentType, "application/pdf");
  assert.equal(email.attachments[0].contentInBase64, Buffer.from("author-safe summary").toString("base64"));
});

test("final developmental review permits reply-only canonical HTML without portal CTA", () => {
  const { validateApprovedAuthorResponsePayload, buildApprovedAuthorResponseEmail } = loadRelayModule();
  const result = validateApprovedAuthorResponsePayload(validFinalDevelopmentalReviewPayload());

  assert.equal(result.ok, true);
  const email = buildApprovedAuthorResponseEmail(result.value);
  const rendered = `${email.content.html}\n${email.content.plainText}`;
  assert.equal(/author\/portal|Author Operating Center|<a\b[^>]+href=/i.test(rendered), false);
  assert.equal(email.attachments.length, 1);
  assert.equal(email.attachments[0].contentType, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
});

test("final developmental review rejects accidental portal links", () => {
  const { validateApprovedAuthorResponsePayload } = loadRelayModule();

  assertRejected(
    validateApprovedAuthorResponsePayload(validFinalDevelopmentalReviewPayload({
      htmlBody: validFinalDevelopmentalReviewPayload().htmlBody.replace(
        "<h2>What happens next</h2>",
        '<a href="https://jmerrill.pub/author/portal?action=final-developmental-review">Open Author Operating Center</a><h2>What happens next</h2>'
      )
    })),
    "AUTHOR_FINAL_DEVELOPMENTAL_REVIEW_REPLY_ONLY_REQUIRED"
  );
});

test("final developmental review rejects duplicate author-facing signatures", () => {
  const { validateApprovedAuthorResponsePayload } = loadRelayModule();
  const base = validFinalDevelopmentalReviewPayload();

  assertRejected(
    validateApprovedAuthorResponsePayload(validFinalDevelopmentalReviewPayload({
      htmlBody: base.htmlBody.replace(
        "</body>",
        "<p>The Publishing Team</p><p>J Merrill Publishing, Inc.</p><p>The Publishing Team</p><p>J Merrill Publishing, Inc.</p></body>"
      )
    })),
    "AUTHOR_REVIEW_PACKAGE_DUPLICATE_SIGNATURE_BLOCKED"
  );
});

test("author-review package permits one canonical signature in html and text alternatives", () => {
  const { validateApprovedAuthorResponsePayload } = loadRelayModule();
  const result = validateApprovedAuthorResponsePayload(validAuthorReviewPackagePayload());

  assert.equal(result.ok, true);
});

test("approved author-review package preserves full attachment base64 payloads", () => {
  const { validateApprovedAuthorResponsePayload, buildApprovedAuthorResponseEmail } = loadRelayModule();
  const payloadBytes = Buffer.from("author-safe summary ".repeat(500));
  const payloadBase64 = payloadBytes.toString("base64");
  assert.ok(payloadBase64.length > 300);

  const result = validateApprovedAuthorResponsePayload(validAuthorReviewPackagePayload({
    attachments: [
      {
        name: "Before You Were Born - Developmental Summary.pdf",
        contentType: "application/pdf",
        contentInBase64: payloadBase64
      }
    ]
  }));

  assert.equal(result.ok, true);
  const email = buildApprovedAuthorResponseEmail(result.value);
  assert.equal(email.attachments[0].contentInBase64, payloadBase64);
  assert.equal(Buffer.byteLength(email.attachments[0].contentInBase64, "base64"), payloadBytes.byteLength);
});

test("relay auth failures return safe responses", () => {
  const { milestoneUnauthorized } = loadRelayModule();

  const response = milestoneUnauthorized(validInternalPayload());
  assert.equal(response.status, 401);
  assert.equal(response.jsonBody.accepted, false);
  assert.equal(response.jsonBody.code, "UNAUTHORIZED");
  assert.equal(Object.hasOwn(response.jsonBody, "headers"), false);
});

test("missing or invalid ACS sender fails safely", () => {
  const relay = loadRelayModule();
  const valid = relay.validateInternalNotificationPayload(validInternalPayload());

  process.env.ACS_EMAIL_SENDER = "";
  assert.throws(() => relay.buildInternalNotificationEmail(valid.value), /ACS sender is missing/);

  process.env.ACS_EMAIL_SENDER = "publishing@jmerrill.pub";
  assert.throws(() => relay.buildInternalNotificationEmail(valid.value), /ACS sender is invalid/);
});

test("missing or invalid author-response ACS sender fails safely", () => {
  const relay = loadRelayModule();
  const valid = relay.validateApprovedAuthorResponsePayload(validAuthorResponsePayload());

  process.env.ACS_AUTHOR_RESPONSE_EMAIL_SENDER = "";
  assert.throws(() => relay.buildApprovedAuthorResponseEmail(valid.value), /ACS author-response sender is missing/);

  process.env.ACS_AUTHOR_RESPONSE_EMAIL_SENDER = "publishing@jmerrill.pub";
  assert.throws(() => relay.buildApprovedAuthorResponseEmail(valid.value), /ACS author-response sender is invalid/);

  process.env.ACS_AUTHOR_RESPONSE_EMAIL_SENDER = "DoNotReply@email.jmerrill.one";
  assert.throws(() => relay.buildApprovedAuthorResponseEmail(valid.value), /ACS author-response sender is invalid/);
});

test("approved editorial recommendation builds ACS email with HTML and plain-text alternative", () => {
  const relay = loadRelayModule();
  const valid = relay.validateApprovedAuthorResponsePayload(validEditorialRecommendationPayload());

  assert.equal(valid.ok, true);
  assert.equal(valid.value.templateVersion, "1.1.0");
  assert.equal(valid.value.templateMetadata.htmlSha256, "a".repeat(64));
  const email = relay.buildApprovedAuthorResponseEmail(valid.value);
  assert.equal(email.senderAddress, "publishing@email.jmerrill.one");
  assert.equal(email.content.subject, "Your Editorial Review & Publishing Recommendation | J Merrill Publishing");
  assert.match(email.content.plainText, /Plain-text fallback/);
  assert.match(email.content.html, /<table/);
  assert.match(email.content.html, /J MERRILL PUBLISHING/);
  assert.equal(email.replyTo[0].address, "publishing@jmerrill.one");
  assert.equal(email.recipients.cc[0].address, "publishing@jmerrill.one");
});

test("approved editorial recommendation rejects text-only payloads", () => {
  const relay = loadRelayModule();
  const result = relay.validateApprovedAuthorResponsePayload(validEditorialRecommendationPayload({ htmlBody: "" }));

  assertRejected(result, "EDITORIAL_RECOMMENDATION_HTML_REQUIRED");
});

test("package-acceptance payment-options payload requires canonical HTML, subject, metadata, and body reference", () => {
  const relay = loadRelayModule();
  const html = `<!doctype html>
<html><body><table><tr><td>J MERRILL PUBLISHING</td></tr></table>
<p>A Division of J Merrill One</p>
<p>Helping Authors Help Themselves.</p>
<h2>Why you are receiving this</h2>
<h2>What JMP has prepared</h2>
<h2>What we need from you</h2>
<a href="https://jmerrill.pub/author/payment-options/test" style="display:inline-block;background:#1d4ed8;">Choose Your Payment Option</a>
<h2>Payment Options</h2>
<h2>What happens next</h2>
<h2>Support</h2>
<p>The Publishing Team</p>
<p>JMP-INT-202608-ABC123</p>
</body></html>`;
  const body = [
    "Why you are receiving this",
    "What JMP has prepared",
    "What we need from you",
    "Payment Options",
    "What happens next",
    "Support",
    "JMP-INT-202608-ABC123"
  ].join("\n");
  const valid = relay.validateApprovedAuthorResponsePayload({
    messageType: "APPROVED_AUTHOR_RESPONSE",
    diagnosticId,
    intakeReferenceCode: "JMP-INT-202608-ABC123",
    authorEmail: "author@example.com",
    authorName: "Author",
    projectTitle: "New Book Test",
    subject: "Your Publishing Payment Options for New Book Test",
    body,
    htmlBody: html,
    templateName: "PACKAGE_ACCEPTANCE_PAYMENT_OPTIONS_V1",
    templateVersion: "1.0.0",
    templateMetadata: {
      htmlSha256: "a".repeat(64),
      textSha256: "b".repeat(64),
      qualityGate: "PASS",
      renderer: "JM1 Enterprise Communication Renderer",
      rendererVersion: "1.0.0",
      renderMode: "CANONICAL_HTML",
      renderTemplateGuard: "PASS"
    },
    approvedBy: "jackie",
    approvedOn: "2026-08-21T08:00:00.000Z",
    internalVisibilityMailbox: "publishing@jmerrill.one",
    futureSendRequiresInternalCopy: true,
    futureSendRequiresDataverseLog: true
  });

  assert.equal(valid.ok, true);
});

test("package-acceptance payload rejects reference-led subject and missing HTML", () => {
  const relay = loadRelayModule();
  const result = relay.validateApprovedAuthorResponsePayload({
    messageType: "APPROVED_AUTHOR_RESPONSE",
    diagnosticId,
    intakeReferenceCode: "JMP-INT-202608-ABC123",
    authorEmail: "author@example.com",
    authorName: "Author",
    projectTitle: "New Book Test",
    subject: "JMP-INT-202608-ABC123 - payment options",
    body: "Plain payment options.",
    htmlBody: "",
    templateName: "PACKAGE_ACCEPTANCE_PAYMENT_OPTIONS_V1",
    approvedBy: "jackie",
    approvedOn: "2026-08-21T08:00:00.000Z",
    internalVisibilityMailbox: "publishing@jmerrill.one",
    futureSendRequiresInternalCopy: true,
    futureSendRequiresDataverseLog: true
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "PACKAGE_ACCEPTANCE_HTML_REQUIRED");
});

test("routes are registered without changing acknowledgment route", () => {
  const { routes } = loadRelayModule();

  assert.equal(Boolean(routes["send-author-acknowledgment"]), true);
  assert.equal(Boolean(routes["send-internal-author-draft-review-notification"]), true);
  assert.equal(Boolean(routes["send-join-internal-notification"]), true);
  assert.equal(Boolean(routes["send-approved-author-response"]), true);
});
