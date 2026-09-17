"use strict";

const { app } = require("@azure/functions");
const { authenticateCaller } = require("../security/callerAuthentication");
const { authorizeCallerForBrand } = require("../policy/callerRegistry");
const { renderTemplate } = require("../templates/renderer");

function response(status, body) {
  return { status, jsonBody: body };
}

app.http("preview-enterprise-template", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "preview-enterprise-template",
  handler: async (request) => {
    const authentication = authenticateCaller(request);
    if (!authentication.ok) return response(authentication.reason === "UNKNOWN_CALLER" ? 403 : 401, { rendered: false, noSend: true, reason: authentication.reason });
    let body;
    try {
      body = await request.json();
    } catch (_error) {
      return response(400, { rendered: false, noSend: true, reason: "INVALID_JSON" });
    }
    const authorization = authorizeCallerForBrand(authentication.caller, body.brand || "PUBLISHING");
    if (!authorization.ok) return response(403, { rendered: false, noSend: true, reason: authorization.reason });
    const rendered = renderTemplate({ templateId: body.templateId, templateVersion: body.templateVersion, data: body.templateData });
    if (!rendered.ok) return response(400, { rendered: false, noSend: true, reason: rendered.reason });
    if (authorization.brand !== "JMP" || rendered.value.metadata.brandId !== "PUBLISHING") {
      return response(403, { rendered: false, noSend: true, reason: "CALLER_BRAND_NOT_AUTHORIZED" });
    }
    return response(200, {
      rendered: true,
      noSend: true,
      subject: rendered.value.subject,
      preheader: rendered.value.preheader,
      html: rendered.value.html,
      plainText: rendered.value.plainText,
      metadata: rendered.value.metadata
    });
  }
});

module.exports = {};
