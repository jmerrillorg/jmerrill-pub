"use strict";

const { app } = require("@azure/functions");
const { runEditorialProjectionMonitor } = require("../editorial/editorialProjectionMonitor");

app.timer("run-editorial-projection-monitor", {
  schedule: "0 15 * * * *",
  handler: async (_timer, context) => {
    const result = await runEditorialProjectionMonitor({ autoReconcile: true });
    if (result.newAlerts) context.warn(`Editorial projection exceptions opened: ${result.newAlerts}`);
  }
});

module.exports = {};
