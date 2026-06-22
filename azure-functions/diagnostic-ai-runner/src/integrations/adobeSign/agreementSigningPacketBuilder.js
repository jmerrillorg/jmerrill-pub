"use strict";

/**
 * Builds the single signing-packet plan: which documents to include,
 * the signer/participant list, and the required signature/initial
 * field plan. Pure — no I/O, no Adobe Sign call.
 *
 * Design decision: present MULTIPLE documents within ONE Adobe Sign
 * agreement (multiple fileInfos), rather than merging them into a
 * single physical file. Adobe Sign natively presents multi-document
 * agreements as a single signing session to the signer — this avoids
 * the risk of merging separate generated documents ourselves while
 * still delivering "one clean agreement packet, one signing session."
 */

const PARTICIPANT_ROLE = Object.freeze({
  SIGNER: "SIGNER"
});

const FIELD_TYPE = Object.freeze({
  SIGNATURE: "SIGNATURE",
  INITIAL: "INITIAL"
});

/**
 * @param {{
 *   authorEmail: string, authorName: string,
 *   publisherEmail: string, publisherName: string,
 *   audiobookIncluded: boolean
 * }} input
 * @returns {{
 *   documents: { role: string, label: string }[],
 *   participants: { email: string, name: string, role: string, order: number }[],
 *   signatureFields: { field: string, label: string, assignedTo: string, documentRole: string }[]
 * }}
 */
function buildSigningPacketPlan(input = {}) {
  const audiobookIncluded = input.audiobookIncluded !== false;

  const documents = [
    { role: "PUBLISHING_AGREEMENT", label: "Publishing Agreement" },
    { role: "PACKAGE_ADDENDUM", label: "Package Addendum" },
    ...(audiobookIncluded ? [{ role: "AUDIOBOOK_ADDENDUM", label: "Audiobook Addendum" }] : []),
    { role: "PAYMENT_DISCLOSURE", label: "Payment Disclosure" }
  ];

  const participants = [
    { email: input.publisherEmail, name: input.publisherName, role: PARTICIPANT_ROLE.SIGNER, order: 1 },
    { email: input.authorEmail, name: input.authorName, role: PARTICIPANT_ROLE.SIGNER, order: 2 }
  ];

  const signatureFields = [
    { field: "PUBLISHER_SIGNATURE", label: "Publisher signature", assignedTo: input.publisherEmail, documentRole: "PUBLISHING_AGREEMENT", type: FIELD_TYPE.SIGNATURE },
    { field: "AUTHOR_SIGNATURE", label: "Author signature", assignedTo: input.authorEmail, documentRole: "PUBLISHING_AGREEMENT", type: FIELD_TYPE.SIGNATURE },
    { field: "PACKAGE_ADDENDUM_ACK", label: "Package Addendum acknowledgement", assignedTo: input.authorEmail, documentRole: "PACKAGE_ADDENDUM", type: FIELD_TYPE.INITIAL },
    ...(audiobookIncluded ? [{ field: "AUDIOBOOK_ADDENDUM_ACK", label: "Audiobook Addendum acknowledgement", assignedTo: input.authorEmail, documentRole: "AUDIOBOOK_ADDENDUM", type: FIELD_TYPE.INITIAL }] : []),
    { field: "PAYMENT_SCHEDULE_ACK", label: "Payment Schedule acknowledgement", assignedTo: input.authorEmail, documentRole: "PAYMENT_DISCLOSURE", type: FIELD_TYPE.INITIAL }
  ];

  return { documents, participants, signatureFields };
}

module.exports = { buildSigningPacketPlan, PARTICIPANT_ROLE, FIELD_TYPE };
