"use strict";

const {
  CLASSIFICATION_AUTHORITY,
  MESSAGE_CLASS
} = require("./constants");
const { extensionFromName, normalizeLower, normalizeString } = require("./util");

const RULES = [
  {
    messageClass: MESSAGE_CLASS.ROYALTY_REPORT,
    authority: CLASSIFICATION_AUTHORITY.DETERMINISTIC,
    confidence: 0.98,
    test: ({ message, sender }) =>
      sender.senderAddress === "sales_comp_dept.us@lightningsource.com" &&
      /lsi pod wholesale comp report|sales compensation report|publisher'?s compensation/i.test(message.subject)
  },
  {
    messageClass: MESSAGE_CLASS.MANUSCRIPT_REVISION,
    authority: CLASSIFICATION_AUTHORITY.HIGH_CONFIDENCE,
    confidence: 0.9,
    test: ({ text, attachmentExtensions }) =>
      /\b(revised manuscript|revision|updated manuscript|corrections attached)\b/i.test(text) &&
      attachmentExtensions.some((ext) => ["docx", "pdf"].includes(ext))
  },
  {
    messageClass: MESSAGE_CLASS.MANUSCRIPT_SUBMISSION,
    authority: CLASSIFICATION_AUTHORITY.HIGH_CONFIDENCE,
    confidence: 0.86,
    test: ({ text, attachmentExtensions }) =>
      /\b(manuscript attached|submitting my manuscript|book manuscript)\b/i.test(text) &&
      attachmentExtensions.some((ext) => ["docx", "pdf"].includes(ext))
  },
  {
    messageClass: MESSAGE_CLASS.AUTHOR_CLARIFICATION,
    authority: CLASSIFICATION_AUTHORITY.HIGH_CONFIDENCE,
    confidence: 0.88,
    test: ({ text }) => /\b(clarification|to clarify|different locations|correction list)\b/i.test(text)
  },
  {
    messageClass: MESSAGE_CLASS.AUTHOR_APPROVAL,
    authority: CLASSIFICATION_AUTHORITY.REVIEW_REQUIRED,
    confidence: 0.82,
    manualReviewRequired: true,
    test: ({ text }) => /\b(i approve|approved|approval|looks good|move forward|proceed)\b/i.test(text)
  },
  {
    messageClass: MESSAGE_CLASS.AUTHOR_REQUEST_CHANGES,
    authority: CLASSIFICATION_AUTHORITY.REVIEW_REQUIRED,
    confidence: 0.82,
    manualReviewRequired: true,
    test: ({ text }) => /\b(request changes|please change|revise|correction|not correct|edits needed)\b/i.test(text)
  },
  {
    messageClass: MESSAGE_CLASS.AUTHOR_DECLINE,
    authority: CLASSIFICATION_AUTHORITY.REVIEW_REQUIRED,
    confidence: 0.8,
    manualReviewRequired: true,
    test: ({ text }) => /\b(decline|do not proceed|cancel|withdraw)\b/i.test(text)
  },
  {
    messageClass: MESSAGE_CLASS.AUTHOR_HOLD_REQUEST,
    authority: CLASSIFICATION_AUTHORITY.REVIEW_REQUIRED,
    confidence: 0.78,
    manualReviewRequired: true,
    test: ({ text }) => /\b(hold|pause|wait|not yet)\b/i.test(text)
  },
  {
    messageClass: MESSAGE_CLASS.AUTHOR_QUESTION,
    authority: CLASSIFICATION_AUTHORITY.REVIEW_REQUIRED,
    confidence: 0.76,
    manualReviewRequired: true,
    test: ({ text }) => /\?|question|please assist|help|code|cannot access|did not receive/i.test(text)
  },
  {
    messageClass: MESSAGE_CLASS.AGREEMENT_RESPONSE,
    authority: CLASSIFICATION_AUTHORITY.REVIEW_REQUIRED,
    confidence: 0.78,
    manualReviewRequired: true,
    test: ({ text }) => /\b(agreement|contract|sign|signature)\b/i.test(text)
  },
  {
    messageClass: MESSAGE_CLASS.PAYMENT_CORRESPONDENCE,
    authority: CLASSIFICATION_AUTHORITY.REVIEW_REQUIRED,
    confidence: 0.78,
    manualReviewRequired: true,
    test: ({ text }) => /\b(payment|invoice|paid|charge|checkout|installment)\b/i.test(text)
  },
  {
    messageClass: MESSAGE_CLASS.SECURITY_NOTICE,
    authority: CLASSIFICATION_AUTHORITY.HIGH_CONFIDENCE,
    confidence: 0.83,
    test: ({ text }) => /\b(security|one-time code|access code|password|sign in|login)\b/i.test(text)
  },
  {
    messageClass: MESSAGE_CLASS.MARKETING_INQUIRY,
    authority: CLASSIFICATION_AUTHORITY.HIGH_CONFIDENCE,
    confidence: 0.7,
    test: ({ text }) => /\b(publicity|review copy|marketing|speaker proposal|conference)\b/i.test(text)
  },
  {
    messageClass: MESSAGE_CLASS.SPAM_SOLICITATION,
    authority: CLASSIFICATION_AUTHORITY.REVIEW_REQUIRED,
    confidence: 0.65,
    manualReviewRequired: true,
    test: ({ text }) => /\b(seo|crypto|limited time|unsubscribe|rank higher|lead generation)\b/i.test(text)
  }
];

function classifyInboundMessage(messageEvidence, attachments = [], senderResolution = {}) {
  const subject = normalizeString(messageEvidence.subject);
  const text = `${subject}\n${normalizeString(messageEvidence.bodyTextForClassification || "")}`;
  const attachmentExtensions = attachments.map((a) => extensionFromName(a.originalFilename || a.name)).filter(Boolean);

  for (const rule of RULES) {
    if (rule.test({ message: messageEvidence, text, attachmentExtensions, sender: senderResolution })) {
      return {
        messageClass: rule.messageClass,
        authority: rule.authority,
        confidence: rule.confidence,
        manualReviewRequired: rule.manualReviewRequired !== false,
        reason: `RULE_${rule.messageClass}`,
        aiBusinessAuthority: false
      };
    }
  }

  return {
    messageClass: MESSAGE_CLASS.UNCLASSIFIED,
    authority: CLASSIFICATION_AUTHORITY.UNCLASSIFIED,
    confidence: 0,
    manualReviewRequired: true,
    reason: "NO_RULE_MATCH",
    aiBusinessAuthority: false
  };
}

module.exports = {
  RULES,
  classifyInboundMessage
};
