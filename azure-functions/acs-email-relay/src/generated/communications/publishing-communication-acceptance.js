// GENERATED from canonical TypeScript; run scripts/build_publishing_communication_runtime.mjs.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAILBOX_VERIFICATION_POLICY = exports.COMMUNICATION_STATE = exports.PUBLISHING_EVIDENCE_MAILBOX = exports.COMMUNICATION_ACCEPTANCE_VERSION = void 0;
exports.providerIdFromInternetMessageId = providerIdFromInternetMessageId;
exports.verifyPublishingMailboxEvidence = verifyPublishingMailboxEvidence;
exports.communicationAcceptance = communicationAcceptance;
exports.COMMUNICATION_ACCEPTANCE_VERSION = '1.0.0';
exports.PUBLISHING_EVIDENCE_MAILBOX = 'publishing@jmerrill.one';
exports.COMMUNICATION_STATE = {
    CREATED: 'CREATED', RENDERED: 'RENDERED', SUBMITTED: 'SUBMITTED',
    PROVIDER_ACCEPTED: 'PROVIDER_ACCEPTED', MAILBOX_VERIFIED: 'MAILBOX_VERIFIED',
    FAILED: 'FAILED', DELIVERY_UNVERIFIED: 'DELIVERY_UNVERIFIED',
};
// Technical verification policy, not an author-response or delivery SLA.
exports.MAILBOX_VERIFICATION_POLICY = {
    version: '1.0.0', windowMs: 30 * 60 * 1000,
    retryOffsetsMs: [0, 60_000, 120_000, 300_000, 600_000, 1_200_000, 1_800_000],
};
function providerIdFromInternetMessageId(value) {
    const match = /^<\d{12}\.([a-f0-9]{32})-[^<>\s]+@microsoft\.com>$/i.exec(value || '');
    return match?.[1]?.toLowerCase() || null;
}
function verifyPublishingMailboxEvidence(command, message, mailbox) {
    const address = (value) => (value || '').trim().toLowerCase();
    const recipients = (command.recipient || '').split(',').map(address).filter(Boolean).sort();
    const actualRecipients = (message.toRecipients || []).map(item => address(item.emailAddress?.address)).sort();
    const providerId = (command.providerMessageId || '').replaceAll('-', '').toLowerCase();
    if (mailbox !== exports.PUBLISHING_EVIDENCE_MAILBOX || !command.jm1MessageId || !command.correlationId
        || !command.businessObjectId || !command.acceptedAt || !message.id || !message.internetMessageId
        || !/^[a-f0-9]{32}$/.test(providerId)
        || providerIdFromInternetMessageId(message.internetMessageId) !== providerId
        || address(message.from?.emailAddress?.address) !== 'publishing@email.jmerrill.one'
        || recipients.length === 0 || JSON.stringify(recipients) !== JSON.stringify(actualRecipients)
        || message.subject !== command.subject
        || (!actualRecipients.includes(mailbox)
            && !(message.ccRecipients || []).some(item => address(item.emailAddress?.address) === mailbox))) {
        return { verified: false, reason: 'MAILBOX_IDENTITY_UNPROVEN' };
    }
    return { verified: true, evidence: { mailbox, mailboxMessageId: message.id,
            mailboxInternetMessageId: message.internetMessageId, providerMessageId: command.providerMessageId,
            communicationId: command.jm1MessageId, correlationId: command.correlationId,
            businessEventId: command.businessObjectId, recipient: command.recipient,
            rendererVersion: command.rendererVersion, templateVersion: command.templateVersion } };
}
function communicationAcceptance(command) {
    const providerAccepted = Boolean(command.providerMessageId && command.acceptedAt);
    const mailboxVerified = Boolean(command.mailboxMessageId && command.mailboxInternetMessageId && command.mailboxVerifiedAt
        && providerIdFromInternetMessageId(command.mailboxInternetMessageId)
            === (command.providerMessageId || '').replaceAll('-', '').toLowerCase());
    const complete = command.contentValid === true && command.canonicalRender === true
        && Boolean(command.rendererVersion && command.templateVersion)
        && providerAccepted && mailboxVerified;
    const state = mailboxVerified ? exports.COMMUNICATION_STATE.MAILBOX_VERIFIED
        : providerAccepted ? (command.communicationState === exports.COMMUNICATION_STATE.DELIVERY_UNVERIFIED
            ? exports.COMMUNICATION_STATE.DELIVERY_UNVERIFIED : exports.COMMUNICATION_STATE.PROVIDER_ACCEPTED)
            : command.communicationState || exports.COMMUNICATION_STATE.CREATED;
    return { acceptanceVersion: exports.COMMUNICATION_ACCEPTANCE_VERSION, communicationId: command.jm1MessageId,
        communicationState: state, communicationComplete: complete, providerAccepted,
        mailboxEvidenceVerified: mailboxVerified, recipientDeliveryProven: false,
        providerMessageId: command.providerMessageId, providerAcceptedAt: command.acceptedAt,
        mailboxMessageId: command.mailboxMessageId, mailboxInternetMessageId: command.mailboxInternetMessageId,
        mailboxVerifiedAt: command.mailboxVerifiedAt,
        observability: { acsAcceptance: providerAccepted ? 'PASS' : 'UNPROVEN',
            publishingMailboxCopy: mailboxVerified ? 'PASS' : 'UNPROVEN',
            recipientDelivery: 'NOT_PROVEN' } };
}
