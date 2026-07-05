"use strict";

/**
 * Dedicated content builder for the Milestone #6 continuation email:
 * package-selection confirmation, payment options, and agreement/onboarding
 * next steps.
 *
 * This is a DIFFERENT content purpose than authorResponseDraftBuilder.js
 * (the Milestone 5 editorial-diagnostic next-step email). This module
 * never includes diagnostic summaries, risk flags, confidence scores,
 * manuscript content, prompt text, or raw model output — none of that
 * content exists in this module's input surface at all.
 *
 * Output is a sendApproval-shaped object compatible with
 * authorResponseSendProviderConfig.js's validateAuthorResponseSendInput,
 * so the existing, already-reviewed, content-agnostic send pipeline
 * (sendConfiguredAuthorResponse) can be reused without modification.
 */

const INTERNAL_VISIBILITY_MAILBOX = "publishing@jmerrill.one";
const TEMPLATE_NAME = "MILESTONE_6_PACKAGE_PAYMENT_ONBOARDING_NEXT_STEP";
const PROCESSING_FEE_RATE = 0.04;

const PACKAGE_DISPLAY_NAMES = Object.freeze({
  "JMP-PKG-STARTER": "Starter Publishing Package",
  "JMP-PKG-PRO": "Professional Publishing Package",
  "JMP-PKG-PREMIER": "Premier Publishing Package",
  "JMP-PKG-CHILD": "Children's Publishing Package"
});

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function emailLooksValid(value) {
  const email = normalizeString(value);
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

function formatUsd(amountUsd) {
  return `$${amountUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Validates a payment option entry: { payments, totalPerInstallmentUsd }.
 */
function isValidPaymentOption(option) {
  return (
    isPlainObject(option) &&
    typeof option.payments === "number" &&
    option.payments > 0 &&
    typeof option.totalPerInstallmentUsd === "number" &&
    option.totalPerInstallmentUsd > 0
  );
}

function safeFailure(reason, input = null) {
  return {
    ok: false,
    code: "MILESTONE_6_CONTINUATION_COMMUNICATION_BLOCKED",
    reason,
    diagnosticId: normalizeString(input?.diagnosticId) || null,
    intakeReferenceCode: normalizeString(input?.intakeReferenceCode) || null
  };
}

function buildPaymentOptionLines(paymentOptions) {
  return paymentOptions.map((option) => {
    if (option.payments === 1) {
      return `  - Single payment: ${formatUsd(option.totalPerInstallmentUsd)}`;
    }
    return `  - ${option.payments} payments: ${formatUsd(option.totalPerInstallmentUsd)} each`;
  });
}

function buildEmailBody({ authorName, projectTitle, packageDisplayName, paymentOptionLines }) {
  return [
    `Hello ${authorName},`,
    "",
    `Thank you for confirming your publishing package for ${projectTitle}. We have you set up with the ${packageDisplayName}.`,
    "",
    "Here are the payment options available for this package. The 4% processing fee applies only to multi-payment options:",
    "",
    ...paymentOptionLines,
    "",
    "You're welcome to choose whichever option works best for you. Once you let us know your choice, we'll follow up with the formal agreement and onboarding materials so we can get everything set up correctly on our end.",
    "",
    "If you'd like to talk through any of this together before deciding, we're glad to schedule a short call — just reply to this email and we'll find a time that works.",
    "",
    "To be clear: nothing moves forward into production until your payment option is selected and the agreement and onboarding steps are complete. There's no rush on our end — we want this to be right for you.",
    "",
    "Warmly,",
    "J Merrill Publishing"
  ].join("\n");
}

/**
 * Validates safe input and builds a sendApproval-shaped object for the
 * Milestone 6 continuation email. Does NOT send anything — pure function.
 *
 * @param {{
 *   diagnosticId: string,
 *   intakeReferenceCode: string,
 *   authorName: string,
 *   authorEmail: string,
 *   projectTitle: string,
 *   selectedPackageCode: string,
 *   paymentOptions: Array<{ payments: number, totalPerInstallmentUsd: number }>,
 *   approvedBy: string,
 *   approvedOn?: string
 * }} input
 * @returns {{ ok: boolean, sendApproval?: object, code?: string, reason?: string }}
 */
function buildMilestone6ContinuationCommunication(input = {}) {
  if (!isPlainObject(input)) return safeFailure("INVALID_INPUT");

  const diagnosticId = normalizeString(input.diagnosticId);
  const intakeReferenceCode = normalizeString(input.intakeReferenceCode);
  const authorName = normalizeString(input.authorName);
  const authorEmail = normalizeString(input.authorEmail).toLowerCase();
  const projectTitle = normalizeString(input.projectTitle);
  const selectedPackageCode = normalizeString(input.selectedPackageCode).toUpperCase();
  const approvedBy = normalizeString(input.approvedBy);
  const approvedOn = normalizeString(input.approvedOn) || new Date().toISOString();

  if (!diagnosticId) return safeFailure("DIAGNOSTIC_ID_MISSING", input);
  if (!intakeReferenceCode) return safeFailure("INTAKE_REFERENCE_CODE_MISSING", input);
  if (!authorName) return safeFailure("AUTHOR_NAME_MISSING", input);
  if (!authorEmail || !emailLooksValid(authorEmail)) return safeFailure("AUTHOR_EMAIL_INVALID", input);
  if (authorEmail.endsWith("@jmerrill.pub")) return safeFailure("JMERRILL_PUB_MAILBOX_NOT_ALLOWED", input);
  if (!projectTitle) return safeFailure("PROJECT_TITLE_MISSING", input);
  if (!PACKAGE_DISPLAY_NAMES[selectedPackageCode]) return safeFailure("SELECTED_PACKAGE_CODE_INVALID", input);
  if (!Array.isArray(input.paymentOptions) || input.paymentOptions.length === 0) {
    return safeFailure("PAYMENT_OPTIONS_MISSING", input);
  }
  if (!input.paymentOptions.every(isValidPaymentOption)) {
    return safeFailure("PAYMENT_OPTIONS_INVALID", input);
  }
  if (!approvedBy) return safeFailure("APPROVED_BY_MISSING", input);

  const packageDisplayName = PACKAGE_DISPLAY_NAMES[selectedPackageCode];
  const paymentOptionLines = buildPaymentOptionLines(input.paymentOptions);
  const subject = `Next steps for ${projectTitle} — ${packageDisplayName}`;
  const body = buildEmailBody({ authorName, projectTitle, packageDisplayName, paymentOptionLines });

  return {
    ok: true,
    sendApproval: {
      diagnosticId,
      intakeReferenceCode,
      authorEmail,
      authorName,
      projectTitle,
      internalVisibilityMailbox: INTERNAL_VISIBILITY_MAILBOX,
      draftSubject: subject,
      draftBody: body,
      templateName: TEMPLATE_NAME,
      decision: "APPROVE_AUTHOR_SEND",
      sendApproved: true,
      approvedBy,
      approvedOn,
      futureSendRequiresInternalCopy: true,
      futureSendRequiresDataverseLog: true
    }
  };
}

module.exports = {
  buildMilestone6ContinuationCommunication,
  PACKAGE_DISPLAY_NAMES,
  PROCESSING_FEE_RATE,
  TEMPLATE_NAME,
  INTERNAL_VISIBILITY_MAILBOX
};
