"use strict";

const { app } = require("@azure/functions");
const {
  buildBlock09FinalCertificationProbe
} = require("../titleManagement/block09TitleManagementCommissioning");

async function runBlock09FinalCertificationProbeHandler() {
  return {
    status: 200,
    jsonBody: buildBlock09FinalCertificationProbe()
  };
}

app.http("run-block09-final-certification-probe", {
  methods: ["GET", "POST"],
  authLevel: "function",
  route: "run-block09-final-certification-probe",
  handler: runBlock09FinalCertificationProbeHandler
});

module.exports = { buildBlock09FinalCertificationProbe, runBlock09FinalCertificationProbeHandler };
