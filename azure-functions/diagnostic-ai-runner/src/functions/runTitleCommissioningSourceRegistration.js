"use strict";
const { app } = require("@azure/functions");
const { sourceRegistrationHandler } = require("../lifecycle/titleCommissioningSourceRegistration");
app.http("title-commissioning-source-registration", { methods: ["POST"], authLevel: "anonymous",
  route: "publishing/commissioning/source-registration", handler: request => sourceRegistrationHandler(request) });
