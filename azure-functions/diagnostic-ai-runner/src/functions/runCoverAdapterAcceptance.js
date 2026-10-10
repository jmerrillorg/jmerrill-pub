"use strict";
const { app } = require("@azure/functions");
const { coverAdapterAcceptanceHandler } = require("../production/coverAdapterAcceptanceHandler");
app.http("publishing-cover-adapter-acceptance", {
  methods: ["POST"], authLevel: "function", route: "publishing/commissioning/cover-adapter-acceptance",
  handler: request => coverAdapterAcceptanceHandler(request)
});
