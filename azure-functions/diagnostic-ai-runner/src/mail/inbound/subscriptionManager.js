"use strict";

const { GRAPH_BASE, MAILBOX } = require("./constants");
const { normalizeString } = require("./util");

const MAX_GRAPH_SUBSCRIPTION_MINUTES = 4230;
const RENEWAL_SAFETY_MINUTES = 60 * 24;

function buildSubscriptionResource(mailbox = MAILBOX, folder = "Inbox") {
  return `/users/${mailbox}/mailFolders('${folder.toLowerCase()}')/messages`;
}

function buildSubscriptionPayload({ notificationUrl, clientState, mailbox = MAILBOX, folder = "Inbox", now = new Date() }) {
  const expiration = new Date(now.getTime() + MAX_GRAPH_SUBSCRIPTION_MINUTES * 60 * 1000);
  return {
    changeType: "created,updated",
    notificationUrl,
    resource: buildSubscriptionResource(mailbox, folder),
    expirationDateTime: expiration.toISOString(),
    clientState
  };
}

function validateClientState(actual, expected) {
  return Boolean(expected && normalizeString(actual) === normalizeString(expected));
}

function shouldRenewSubscription(subscription, now = new Date()) {
  const expiresAt = Date.parse(subscription?.expirationDateTime || subscription?.expiresAt || "");
  if (Number.isNaN(expiresAt)) return true;
  return expiresAt - now.getTime() <= RENEWAL_SAFETY_MINUTES * 60 * 1000;
}

async function createSubscription(graphClient, input) {
  const payload = buildSubscriptionPayload(input);
  const result = await graphClient.request("POST", "/subscriptions", payload);
  return {
    subscriptionId: result.id,
    resource: result.resource || payload.resource,
    createdAt: new Date().toISOString(),
    expiresAt: result.expirationDateTime || payload.expirationDateTime,
    renewedAt: null,
    renewalResult: null,
    clientStateAuthority: "STATIC_SECRET_MATCH",
    lastNotificationAt: null,
    status: "ACTIVE"
  };
}

async function renewSubscription(graphClient, subscription) {
  const payload = { expirationDateTime: buildSubscriptionPayload({ notificationUrl: "unused", clientState: "unused" }).expirationDateTime };
  const result = await graphClient.request("PATCH", `/subscriptions/${encodeURIComponent(subscription.subscriptionId || subscription.id)}`, payload);
  return {
    ...subscription,
    expiresAt: result.expirationDateTime || payload.expirationDateTime,
    renewedAt: new Date().toISOString(),
    renewalResult: "PASS",
    status: "ACTIVE"
  };
}

module.exports = {
  MAX_GRAPH_SUBSCRIPTION_MINUTES,
  RENEWAL_SAFETY_MINUTES,
  buildSubscriptionResource,
  buildSubscriptionPayload,
  validateClientState,
  shouldRenewSubscription,
  createSubscription,
  renewSubscription
};
