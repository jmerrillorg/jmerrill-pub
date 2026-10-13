"use strict";
const { app } = require("@azure/functions");
const { handler } = require("../distribution/sourceReader");
app.http("read-distributor-sources", { methods: ["POST"], authLevel: "anonymous", route: "publishing/distributor/sources", handler: request => handler(request) });
