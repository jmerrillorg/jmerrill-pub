"use strict";

const POLICY_ID = "JMP-STRIPE-CONNECT-REMINDER-CADENCE-v1";
const STAGES = Object.freeze([
  { eventType: "REMINDER_1", cadenceDay: 3, label: "DAY_3" },
  { eventType: "REMINDER_2", cadenceDay: 7, label: "DAY_7" },
  { eventType: "FINAL_REMINDER", cadenceDay: 14, label: "DAY_14" }
]);
const ELIGIBLE_STATES = new Set(["NOT_STARTED", "SETUP_LINK_READY", "SETUP_IN_PROGRESS", "MORE_INFORMATION_NEEDED"]);
const STOP_STATES = new Set(["SETUP_COMPLETE", "UNDER_REVIEW", "IDENTITY_REVIEW", "DUPLICATE_REVIEW", "EXTERNAL_BLOCK"]);
const ACTION_TYPES = Object.freeze({
  REMINDER_1: "STRIPE_CONNECT_REMINDER_1_SENT",
  REMINDER_2: "STRIPE_CONNECT_REMINDER_2_SENT",
  FINAL_REMINDER: "STRIPE_CONNECT_FINAL_REMINDER_SENT"
});

function classifyReminder(row, nowInput = new Date()) {
  const now = date(nowInput);
  const initialAt = date(row.initialValidInvitationAt);
  const state = text(row.state);
  if (row.suppressed) return blocked(row, "SUPPRESSION_ACTIVE");
  if (STOP_STATES.has(state)) return blocked(row, state);
  if (row.supportState === "ACTIVE_SUPPORT") return blocked(row, "ACTIVE_SUPPORT_THREAD", "SUPPORT_HOLD");
  if (!ELIGIBLE_STATES.has(state)) return blocked(row, state || "UNKNOWN_STRIPE_STATE");
  if (!row.accountExists) return blocked(row, "ACCOUNT_NOT_READY_FOR_FRESH_LINK");
  if (!initialAt) return blocked(row, "INITIAL_VALID_INVITATION_NOT_PROVEN");
  const history = new Set((row.reminderHistory || []).map((item) => text(item.eventType)));
  if (history.has("FINAL_REMINDER")) return blocked(row, "FINAL_REMINDER_ALREADY_SENT", "AUTOMATION_COMPLETE");
  const stage = !history.has("REMINDER_1") ? STAGES[0] : !history.has("REMINDER_2") ? STAGES[1] : STAGES[2];
  const eligibleAt = new Date(initialAt.getTime() + stage.cadenceDay * 86400000);
  if (now < eligibleAt) return blocked(row, "NOT_DUE", "NO_REMINDER", stage, eligibleAt);
  if ((row.reminderHistory || []).some((item) => text(item.eventType) === stage.eventType && sameUtcDay(item.sentAt, now))) {
    return blocked(row, "SAME_DAY_DUPLICATE_GUARD", "NO_REMINDER", stage, eligibleAt);
  }
  return {
    author: row.authorName,
    contactId: row.contactId,
    authorRelationshipId: row.authorRelationshipId,
    state,
    disposition: `${stage.label}_ELIGIBLE`,
    reminderStage: stage.eventType,
    cadenceDay: stage.cadenceDay,
    eligibleAt: eligibleAt.toISOString(),
    send: true,
    reason: "CADENCE_ELAPSED_AND_AUTHOR_ACTION_STILL_NEEDED"
  };
}

function renderReminder({ authorName, stage, state, linkUrl }) {
  const first = text(authorName).split(/\s+/)[0] || "there";
  const subject = "Complete Your Direct Deposit Setup";
  const stateLine = state === "MORE_INFORMATION_NEEDED"
    ? "Stripe still needs a little more information from you before direct deposit setup is complete."
    : state === "SETUP_IN_PROGRESS"
      ? "Your direct deposit setup with J Merrill Publishing is still in progress."
      : "Your direct deposit setup with J Merrill Publishing is still waiting for you.";
  const purpose = stage === "REMINDER_2"
    ? "Finishing this now means your payment destination is ready when J Merrill Publishing later has an authorized payment to send."
    : stage === "FINAL_REMINDER"
      ? "This is our final automatic reminder about completing your direct deposit setup."
      : "We use Stripe to securely collect the banking and tax information needed for future direct deposits.";
  const stopLine = stage === "FINAL_REMINDER"
    ? "After this message, automated setup reminders stop. If something is preventing you from completing setup, reply and we will help."
    : "If you are having trouble, reply to this email and we will help.";
  const body = [
    `Good day, ${first},`, "", stateLine, "", purpose, "", `Continue here: ${linkUrl}`, "",
    "No separate J Merrill Publishing activation code is required. If Stripe asks you to verify your email address or phone number, that verification comes directly from Stripe.",
    "", stopLine, "", "The Publishing Team", "J Merrill Publishing, Inc."
  ].join("\n");
  const htmlBody = `<!doctype html><html><body><p>Good day, ${escapeHtml(first)},</p><p>${escapeHtml(stateLine)}</p><p>${escapeHtml(purpose)}</p><p><a href="${escapeHtml(linkUrl)}">Continue Direct Deposit Setup</a></p><p>No separate J Merrill Publishing activation code is required. If Stripe asks you to verify your email address or phone number, that verification comes directly from Stripe.</p><p>${escapeHtml(stopLine)}</p><p>The Publishing Team<br>J Merrill Publishing, Inc.</p></body></html>`;
  return { subject, body, htmlBody };
}

function blocked(row, reason, disposition = "NO_REMINDER", stage = null, eligibleAt = null) {
  return {
    author: row.authorName,
    contactId: row.contactId,
    authorRelationshipId: row.authorRelationshipId,
    state: text(row.state),
    disposition,
    reminderStage: stage?.eventType || "",
    cadenceDay: stage?.cadenceDay ?? null,
    eligibleAt: eligibleAt?.toISOString?.() || "",
    send: false,
    reason
  };
}

function sameUtcDay(value, now) {
  const candidate = date(value);
  return Boolean(candidate && candidate.toISOString().slice(0, 10) === now.toISOString().slice(0, 10));
}

function date(value) {
  if (!value) return null;
  const result = value instanceof Date ? value : new Date(value);
  return Number.isFinite(result.getTime()) ? result : null;
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function escapeHtml(value) {
  return String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

module.exports = { ACTION_TYPES, POLICY_ID, classifyReminder, renderReminder };
