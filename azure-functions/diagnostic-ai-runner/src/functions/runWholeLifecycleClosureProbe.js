"use strict";

const { app } = require("@azure/functions");
const {
  buildWholeLifecycleClosureProbe
} = require("../lifecycle/wholeSystemLifecycleClosure");

async function runWholeLifecycleClosureProbeHandler() {
  return {
    status: 200,
    jsonBody: buildWholeLifecycleClosureProbe()
  };
}

app.http("run-whole-lifecycle-closure-probe", {
  methods: ["GET", "POST"],
  authLevel: "function",
  route: "run-whole-lifecycle-closure-probe",
  handler: runWholeLifecycleClosureProbeHandler
});

module.exports = { buildWholeLifecycleClosureProbe, runWholeLifecycleClosureProbeHandler };
