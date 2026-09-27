"use strict";

async function sendWithCompletedReceipt(client, message) {
  const poller = await client.beginSend(message);
  if (!poller || typeof poller.pollUntilDone !== "function") {
    throw Object.assign(new Error("ACS completion unavailable."), { safeCode: "ACS_DELIVERY_UNPROVEN" });
  }
  const result = await poller.pollUntilDone();
  const providerMessageId = typeof result?.id === "string" ? result.id.trim() : "";
  if (result?.status !== "Succeeded" || !providerMessageId) {
    throw Object.assign(new Error("ACS completion unproven."), { safeCode: "ACS_DELIVERY_UNPROVEN" });
  }
  return { providerMessageId, providerStatus: result.status };
}

module.exports = { sendWithCompletedReceipt };
