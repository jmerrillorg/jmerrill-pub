"use strict";

const TEMPLATE_REGISTRY_VERSION = "JM1-EMAIL-TEMPLATES-v1.0.0";
const ACTIVE = "ACTIVE";
const PAYMENT_CODES = Object.freeze([
  "FULL_PAY",
  "2_PAY",
  "4_PAY",
  "8_PAY",
  "12_PAY",
  "18_PAY",
  "24_PAY"
]);

const TEMPLATE_REGISTRY = Object.freeze([
  template({
    templateId: "PUBLISHING.PAYMENT_ELECTION_REQUIRED",
    templateVersion: "1.0.0",
    brandId: "PUBLISHING",
    purpose: "Request an author's selection from already-authorized payment options.",
    subject: "Your Publishing Payment Options for {{projectTitle}}",
    preheader: "Choose the payment option that works best for you.",
    dataSchema: {
      authorFirstName: "required safe text",
      projectTitle: "required safe text",
      packageName: "required safe text",
      baseAmountCents: "required non-negative integer",
      options: "required 1-7 governed payment option objects"
    },
    ctaSchema: null,
    contentAuthority: "JMP-PACKAGE-ACCEPTANCE-LIVE-COMMISSIONING-2026-08-21",
    designTokenVersion: "PUBLISHING-EMAIL-v1.0.0",
    status: ACTIVE
  }),
  template({
    templateId: "PUBLISHING.AUTHOR_ONBOARDING_V1",
    templateVersion: "1.0.0",
    brandId: "PUBLISHING",
    purpose: "Invite an eligible author to the governed author onboarding experience.",
    subject: "Begin Author Onboarding for {{projectTitle}}",
    preheader: "Your secure author onboarding is ready.",
    dataSchema: {
      authorFirstName: "required safe text",
      projectTitle: "required safe text",
      onboardingUrl: "required governed HTTPS onboarding URL"
    },
    ctaSchema: "Begin Author Onboarding",
    contentAuthority: "AUTHOR_ONBOARDING_V1",
    designTokenVersion: "PUBLISHING-EMAIL-v1.0.0",
    status: ACTIVE
  }),
  template({
    templateId: "PUBLISHING.PAYMENT_REQUEST_READY",
    templateVersion: "1.0.0",
    brandId: "PUBLISHING",
    purpose: "Notify an author that an already-authorized payment request is ready.",
    subject: null,
    preheader: null,
    dataSchema: null,
    ctaSchema: null,
    contentAuthority: "Requires consolidated production copy authority before activation.",
    designTokenVersion: "PUBLISHING-EMAIL-v1.0.0",
    status: "BLOCKED_BY_COPY_AUTHORITY"
  }),
  template({
    templateId: "PUBLISHING.AGREEMENT_OR_COMMERCIAL_HANDOFF",
    templateVersion: "1.0.0",
    brandId: "PUBLISHING",
    purpose: "Present an authorized agreement or commercial handoff.",
    subject: null,
    preheader: null,
    dataSchema: null,
    ctaSchema: null,
    contentAuthority: "Requires one bounded purpose and copy authority before activation.",
    designTokenVersion: "PUBLISHING-EMAIL-v1.0.0",
    status: "BLOCKED_BY_COPY_AUTHORITY"
  })
]);

function template(value) {
  return Object.freeze({ ...value, dataSchema: value.dataSchema ? Object.freeze({ ...value.dataSchema }) : null });
}

function normalizeTemplateId(value) {
  return String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
}

function findTemplate(templateId, templateVersion) {
  const id = normalizeTemplateId(templateId);
  const version = String(templateVersion || "").trim();
  return TEMPLATE_REGISTRY.find((entry) => entry.templateId === id && entry.templateVersion === version) || null;
}

function isGovernedNamespace(templateId) {
  return normalizeTemplateId(templateId).startsWith("PUBLISHING.");
}

function listTemplates() {
  return [...TEMPLATE_REGISTRY];
}

module.exports = {
  ACTIVE,
  PAYMENT_CODES,
  TEMPLATE_REGISTRY_VERSION,
  findTemplate,
  isGovernedNamespace,
  listTemplates,
  normalizeTemplateId
};
