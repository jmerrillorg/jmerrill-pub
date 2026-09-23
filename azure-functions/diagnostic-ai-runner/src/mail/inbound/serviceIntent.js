"use strict";

const { authorReplyText } = require("./replyText");

function questionAuthority(question) {
  if (/\b(acknowledg(?:e)?ments?|dedications?)\b/i.test(question)) {
    return { authority: "PROCESS_POLICY", source: "GOVERNED_FRONT_MATTER_POLICY", humanJudgment: false };
  }
  if (/\bnext step\b/i.test(question)) {
    return { authority: "CURRENT_LIFECYCLE_STATE", source: "DATAVERSE_CURRENT_MOVEMENT", humanJudgment: false };
  }
  return { authority: "EDITORIAL_EVIDENCE_REVIEW", source: "CURRENT_DELIVERED_EDITORIAL_ARTIFACT",
    humanJudgment: "UNDETERMINED_UNTIL_EVIDENCE_REVIEW" };
}

function serviceIntent(graphMessage, classification) {
  const rawReply = authorReplyText(graphMessage);
  const reply = rawReply.replace(/\s+/g, " ").trim();
  if (/\bapprov(?:e|ed|al) with questions\b/i.test(reply)) {
    const remainder = reply.replace(/\bapprov(?:e|ed|al) with questions\b/i, "")
      .replace(/\b(thank you|thanks|regards|sincerely)\b/gi, "").replace(/[^\p{L}\p{N}?]/gu, "").trim();
    if (!remainder && !reply.includes("?")) return { intent: "AUTHOR_QUESTIONS_MISSING", humanGate: false };
    return { intent: "EDITORIAL_JUDGMENT_REQUIRED", humanGate: true };
  }
  if (/\btitle of the book is\b/i.test(reply) && /\b(update|change)\b/i.test(reply)) {
    return { intent: "TITLE_CHANGE_ACKNOWLEDGMENT", humanGate: false, transitionHeld: true };
  }
  if (/\bapprov(?:e|ed|al)\b.{0,80}\bwith corrections\b/i.test(reply)) {
    return { intent: "EDITORIAL_CORRECTIONS_ACKNOWLEDGMENT", humanGate: false, transitionHeld: true };
  }
  if (classification === "PAYMENT_CORRESPONDENCE" && /\b(payments?|installments?|invoices?|links?)\b/i.test(reply)) {
    if (/\b(change|modify|amend|waive|discount|reduce|increase|postpone|reschedule|extend|different amount|different date)\b/i.test(reply)) {
      return { intent: "COMMERCIAL_EXCEPTION_REQUEST", humanGate: true };
    }
    if (/\b(details?|schedule|amounts?|dates?|terms?)\b/i.test(reply) ||
        /\b(?:second|third|2nd|3rd)\b[\s\S]*\b(?:and|&)\b[\s\S]*\b(?:second|third|2nd|3rd)\b/i.test(reply)) {
      return { intent: "PAYMENT_SCHEDULE_DETAILS", humanGate: false };
    }
    return { intent: "PAYMENT_LINK_ACCESS", humanGate: false };
  }
  if (classification === "AUTHOR_QUESTION" || (classification === "AUTHOR_CLARIFICATION" && reply.includes("?"))) {
    const questions = rawReply.split(/\r?\n/).map((line) => line.replace(/^\s*\d+[.)]\s*/, "").trim())
      .filter((line) => line.length >= 6 && line.length <= 300 && line.endsWith("?")).slice(0, 10);
    if (questions.length === 0) {
      questions.push(...[...reply.matchAll(/(?:^|[.!?]\s+|\b\d+[.)]\s*)([^?.!]{5,300}\?)/g)]
        .map((match) => match[1].trim()).slice(0, 10));
    }
    return { intent: "EDITORIAL_QUESTION_REVIEW", humanGate: true, questions,
      questionPlan: questions.map((question) => ({ question, ...questionAuthority(question) })) };
  }
  return { intent: "NO_ROUTINE_SERVICE_RULE", humanGate: false };
}

function serviceCopy(intent, authorName, title, sourceSubject, linkResult = {}) {
  const firstName = String(authorName || "").trim().split(/\s+/)[0];
  const subject = /^Re:/i.test(sourceSubject || "") ? sourceSubject : `Re: ${sourceSubject || title}`;
  const opening = `Good day, ${firstName},`;
  const endings = "\n\nJ Merrill Publishing";
  let message;
  switch (intent) {
    case "AUTHOR_QUESTIONS_MISSING":
      message = `Thank you for reviewing ${title}. Your note mentioned questions, but they did not come through in the message. Would you reply with the questions so we can address them before moving forward?`;
      break;
    case "PAYMENT_LINK_ACCESS":
      message = linkResult.status === "VALID"
        ? `Thank you for asking about your upcoming installment payments. Here is the current secure link for your next scheduled installment:\n\n${linkResult.url}\n\nPlease let us know whether the earlier link reached you and whether this one opens correctly. You do not need to send any card or bank details by email.`
        : "Thank you for asking about your upcoming installment payments. We are checking the existing payment link before sending it again. Did you receive the earlier link, and were you able to open it? We will follow up with the verified payment details.";
      break;
    case "TITLE_CHANGE_ACKNOWLEDGMENT":
      message = "Thank you for sharing your requested title update. We have received it and will review it with your current project materials. We will confirm the title before applying it to the manuscript or other materials.";
      break;
    case "EDITORIAL_CORRECTIONS_ACKNOWLEDGMENT":
      message = "Thank you for reviewing the edited manuscript. We understand that you approve the developmental edit with corrections. We will review the identified points and let you know when the revised manuscript is ready for your final review.";
      break;
    default:
      return null;
  }
  return { subject, body: `${opening}\n\n${message}${endings}` };
}

module.exports = { questionAuthority, serviceIntent, serviceCopy };
