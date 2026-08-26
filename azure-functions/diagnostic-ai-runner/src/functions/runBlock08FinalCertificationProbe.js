"use strict";

const { app } = require("@azure/functions");
const {
  buildBlock08FinalCertificationProbe
} = require("../marketing/block08LaunchMarketingCommissioning");

async function runBlock08FinalCertificationProbeHandler() {
  return {
    status: 200,
    jsonBody: buildBlock08FinalCertificationProbe()
  };
}

app.http("run-block08-final-certification-probe", {
  methods: ["GET", "POST"],
  authLevel: "function",
  route: "run-block08-final-certification-probe",
  handler: runBlock08FinalCertificationProbeHandler
});

module.exports = { buildBlock08FinalCertificationProbe, runBlock08FinalCertificationProbeHandler };
