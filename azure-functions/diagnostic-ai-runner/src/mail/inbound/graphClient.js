"use strict";

const { DefaultAzureCredential } = require("@azure/identity");
const { GRAPH_BASE, GRAPH_SCOPE, MAILBOX } = require("./constants");

async function getGraphToken(deps = {}) {
  if (deps.getToken) return deps.getToken(GRAPH_SCOPE);
  const credential = new DefaultAzureCredential();
  const tokenResponse = await credential.getToken(GRAPH_SCOPE);
  if (!tokenResponse || !tokenResponse.token) {
    throw Object.assign(new Error("Failed to acquire Graph token"), { safeCode: "GRAPH_TOKEN_FAILED" });
  }
  return tokenResponse.token;
}

class PublishingMailboxGraphClient {
  constructor(options = {}) {
    this.mailbox = options.mailbox || MAILBOX;
    this.fetchImpl = options.fetchImpl || global.fetch;
    this.getToken = options.getToken || getGraphToken;
  }

  async request(method, path, body = null, headers = {}) {
    const token = await this.getToken();
    const response = await this.fetchImpl(`${GRAPH_BASE}${path}`, {
      method,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...headers
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw Object.assign(new Error(`Graph ${method} failed: HTTP ${response.status}`), {
        safeCode: "GRAPH_REQUEST_FAILED",
        httpStatus: response.status,
        graphError: json?.error?.code || null
      });
    }
    return json;
  }

  messageSelect() {
    return [
      "id",
      "subject",
      "from",
      "toRecipients",
      "ccRecipients",
      "receivedDateTime",
      "bodyPreview",
      "body",
      "internetMessageId",
      "internetMessageHeaders",
      "conversationId",
      "hasAttachments",
      "categories"
    ].join(",");
  }

  async getMessage(messageId) {
    const select = encodeURIComponent(this.messageSelect());
    return this.request(
      "GET",
      `/users/${encodeURIComponent(this.mailbox)}/messages/${encodeURIComponent(messageId)}?$select=${select}`,
      null,
      { "Prefer": 'outlook.body-content-type="text"' }
    );
  }

  async listInboxMessagesSince(afterIso, top = 25) {
    const select = encodeURIComponent(this.messageSelect());
    const filter = afterIso ? `&$filter=${encodeURIComponent(`receivedDateTime ge ${afterIso}`)}` : "";
    return this.request(
      "GET",
      `/users/${encodeURIComponent(this.mailbox)}/mailFolders/inbox/messages?$select=${select}&$orderby=receivedDateTime desc&$top=${top}${filter}`,
      null,
      { "Prefer": 'outlook.body-content-type="text"' }
    );
  }

  async listAttachments(messageId) {
    return this.request(
      "GET",
      `/users/${encodeURIComponent(this.mailbox)}/messages/${encodeURIComponent(messageId)}/attachments?$select=id,name,contentType,size,isInline,lastModifiedDateTime`
    );
  }

  async getAttachmentContent(messageId, attachmentId) {
    return this.request(
      "GET",
      `/users/${encodeURIComponent(this.mailbox)}/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`
    );
  }

  async delta(deltaUrlOrToken = null) {
    if (deltaUrlOrToken && /^https:\/\/graph\.microsoft\.com\//i.test(deltaUrlOrToken)) {
      return this.request("GET", deltaUrlOrToken.replace(GRAPH_BASE, ""));
    }
    const select = encodeURIComponent(this.messageSelect());
    return this.request("GET", `/users/${encodeURIComponent(this.mailbox)}/mailFolders/inbox/messages/delta?$select=${select}`);
  }
}

module.exports = {
  getGraphToken,
  PublishingMailboxGraphClient
};
