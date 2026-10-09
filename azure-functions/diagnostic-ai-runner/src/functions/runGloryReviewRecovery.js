"use strict";
const { app } = require("@azure/functions");
const { gloryRecoveryHandler } = require("../lifecycle/gloryReviewRecoveryRuntime");
app.http("publishing-glory-review-recovery", { methods: ["POST"], authLevel: "function",
  route: "publishing/commissioning/glory-review-recovery", handler: request => gloryRecoveryHandler(request) });
