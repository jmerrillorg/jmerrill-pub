"use strict";

/**
 * Governed simplified single-packet agreement generation.
 *
 * Produces the NEXT-generation agreement packet — the Publishing
 * Agreement (canonical, filled, unchanged) plus three NEW, simplified
 * documents: a package-specific Package Addendum, a simplified
 * Audiobook section, and a Stripe-aligned Payment Disclosure replacing
 * the manual Schedule A instrument. Designed to be presented to Adobe
 * Sign as multiple fileInfos within ONE agreement (a single signing
 * session) once Adobe Sign credentials exist — this module never calls
 * Adobe Sign and never sends anything.
 *
 * This does NOT replace or regenerate documents for any already-sent
 * controlled record. It is a standalone build/test capability until
 * explicitly authorized for a specific record.
 *
 * Reuses the existing JM1_AGREEMENT_DOCUMENT_PREPARATION_ENABLED gate
 * (the same governed "prepare agreement documents" capability category
 * as the original four-document flow) — checked fresh on every call.
 *
 * Safety boundaries:
 *   - Never invents a value — all content comes from
 *     agreementFieldComputer.js, packageSpecificAddendumContent.js,
 *     simplifiedAudiobookContent.js, and paymentDisclosureBuilder.js,
 *     none of which guess at unconfirmed data.
 *   - Never reads the manuscript, never calls an AI model.
 *   - Never sends anything — output is written to the same governed
 *     generated-output path, never the template path.
 */

const { computeAgreementFields, formatUsd } = require("./agreementFieldComputer");
const { buildPackageSpecificAddendumSections } = require("./packageSpecificAddendumContent");
const { buildSimplifiedAudiobookSection } = require("./simplifiedAudiobookContent");
const { generateSimplifiedPackageAddendumDocument } = require("./simplifiedPackageAddendumGenerator");
const { generateSimplifiedAudiobookSectionDocument } = require("./simplifiedAudiobookSectionGenerator");
const { generatePaymentDisclosureDocument } = require("./paymentDisclosureDocumentGenerator");
const { buildSigningPacketPlan } = require("../integrations/adobeSign/agreementSigningPacketBuilder");
const { GATE_NAME } = require("./agreementPreparationRunner");

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function isGateOpen() {
  return normalizeString(process.env[GATE_NAME]).toLowerCase() === "true";
}

function blocked(reason, extra = {}) {
  return { ok: false, code: "SIMPLIFIED_AGREEMENT_PACKET_BLOCKED", reason, ...extra };
}

/**
 * Generates the simplified packet's three NEW documents (Package
 * Addendum, Audiobook section, Payment Disclosure) plus the
 * Adobe-Sign-ready packet plan. Does NOT generate or touch the
 * Publishing Agreement itself (unchanged, produced by
 * agreementPreparationRunner.js) and does NOT send anything.
 *
 * @param {{
 *   diagnosticId: string, title: string, authorLegalName: string,
 *   authorEmail: string, imprintLabel: string,
 *   officialManuscriptWordCount: number, selectedPackageCode: string,
 *   paymentOption: string, contractDate?: string
 * }} input
 * @param {{ writeOutput?: (name: string, buffer: Buffer) => Promise<string> }} [deps]
 * @returns {Promise<object>}
 */
async function generateSimplifiedAgreementPacket(input = {}, deps = {}) {
  if (!isPlainObject(input)) return blocked("INVALID_INPUT");

  const diagnosticId = normalizeString(input.diagnosticId);
  if (!diagnosticId) return blocked("DIAGNOSTIC_ID_REQUIRED");

  if (!isGateOpen()) return blocked("GATE_CLOSED", { gate: GATE_NAME });

  const fields = computeAgreementFields(input);
  if (!fields.ok) return blocked("FIELD_COMPUTATION_FAILED", { errors: fields.errors });

  const packageContent = buildPackageSpecificAddendumSections(input.selectedPackageCode);
  if (!packageContent.ok) {
    return blocked("PACKAGE_CONTENT_NOT_DEFINED", { detail: packageContent.error });
  }

  const audiobookSection = buildSimplifiedAudiobookSection({
    packageCode: input.selectedPackageCode,
    audiobookIncludedInPackage: fields.audiobookIncluded
  });

  const paymentSummaryLine = fields.paymentSchedule.installments === 1
    ? `One payment of ${fields.paymentSchedule.perInstallmentFormatted}.`
    : `${fields.paymentSchedule.installments} payments of ${fields.paymentSchedule.perInstallmentFormatted} each (total ${fields.paymentSchedule.totalFormatted}).`;

  const documents = [];

  const addendumBuffer = await generateSimplifiedPackageAddendumDocument({
    title: fields.title,
    authorLegalName: fields.authorLegalName,
    contractDate: fields.contractDate,
    packageAddendumContent: packageContent,
    packageFeeFormatted: fields.packageFeeFormatted,
    paymentDisclosureSummaryLine: paymentSummaryLine
  });
  documents.push({ role: "PACKAGE_ADDENDUM", name: `JMP_Simplified_Package_Addendum_${diagnosticId}.docx`, buffer: addendumBuffer });

  if (fields.audiobookIncluded) {
    const audiobookBuffer = await generateSimplifiedAudiobookSectionDocument({
      title: fields.title,
      authorLegalName: fields.authorLegalName,
      contractDate: fields.contractDate,
      audiobookSection
    });
    documents.push({ role: "AUDIOBOOK_ADDENDUM", name: `JMP_Simplified_Audiobook_Section_${diagnosticId}.docx`, buffer: audiobookBuffer });
  }

  const disclosureBuffer = await generatePaymentDisclosureDocument({
    title: fields.title,
    authorLegalName: fields.authorLegalName,
    contractDate: fields.contractDate,
    paymentSchedule: fields.paymentSchedule
  });
  documents.push({ role: "PAYMENT_DISCLOSURE", name: `JMP_Payment_Disclosure_${diagnosticId}.docx`, buffer: disclosureBuffer });

  const signingPacketPlan = buildSigningPacketPlan({
    authorEmail: input.authorEmail || null,
    authorName: fields.authorLegalName,
    publisherEmail: "publishing@jmerrill.one",
    publisherName: "J Merrill Publishing",
    audiobookIncluded: fields.audiobookIncluded
  });

  const outputPaths = [];
  if (typeof deps.writeOutput === "function") {
    for (const doc of documents) {
      const outputPath = await deps.writeOutput(doc.name, doc.buffer);
      outputPaths.push({ role: doc.role, name: doc.name, outputPath });
    }
  }

  return {
    ok: true,
    code: "SIMPLIFIED_AGREEMENT_PACKET_GENERATED",
    diagnosticId,
    packageSpecific: true,
    audiobookSimplified: true,
    paymentDisclosureReplacesScheduleA: true,
    documents: documents.map((d) => ({ role: d.role, name: d.name, byteLength: d.buffer.length })),
    outputPaths,
    signingPacketPlan,
    fields: {
      packageLabel: fields.packageLabel,
      packageFeeFormatted: fields.packageFeeFormatted,
      complimentaryCopies: fields.complimentaryCopies,
      audiobookIncluded: fields.audiobookIncluded,
      paymentSchedule: fields.paymentSchedule
    },
    gateUsed: GATE_NAME,
    liveActions: {
      readManuscript: false,
      calledAiModel: false,
      calledAdobeSign: false,
      sentAuthorFacingOutput: false,
      reissuedExistingControlledRecord: false,
      createsPaymentLink: false,
      startsProduction: false,
      submitsDistribution: false,
      activatesLaunch: false,
      createsRoyaltyAction: false,
      activatesMarketing: false
    }
  };
}

module.exports = { generateSimplifiedAgreementPacket, formatUsd, GATE_NAME };
