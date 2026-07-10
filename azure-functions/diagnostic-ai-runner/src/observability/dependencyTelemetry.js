"use strict";

let cachedClient = null;
let telemetryInitAttempted = false;
let dependencyClientWarningLogged = false;
const FLUSH_TIMEOUT_MS = 2000;

function getAppInsightsClient() {
  if (telemetryInitAttempted) {
    return cachedClient;
  }

  telemetryInitAttempted = true;

  try {
    const appInsights = require("applicationinsights");

    if (!appInsights.defaultClient) {
      const setup = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING
        ? appInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING)
        : appInsights.setup();

      setup
        .setAutoCollectDependencies(false)
        .setAutoCollectConsole(false)
        .setAutoCollectExceptions(false)
        .setAutoCollectPerformance(false)
        .setAutoCollectRequests(false)
        .setAutoDependencyCorrelation(false)
        .setUseDiskRetryCaching(false)
        .start();
    }

    cachedClient = appInsights.defaultClient || null;
  } catch (_error) {
    cachedClient = null;
  }

  return cachedClient;
}

function buildProperties(telemetry, properties) {
  return {
    correlationId: telemetry?.correlationId || null,
    diagnosticId: telemetry?.diagnosticId || null,
    executionType: telemetry?.executionType || null,
    ...properties
  };
}

function logDependency(telemetry, name, success, resultCode, duration) {
  if (!telemetry?.context?.info) {
    return;
  }

  telemetry.context.info(
    `Dependency trace; name=${name}; success=${success}; resultCode=${resultCode}; durationMs=${duration}; correlationId=${telemetry?.correlationId || "none"}`
  );
}

function logClientUnavailable(telemetry) {
  if (dependencyClientWarningLogged || !telemetry?.context?.warn) {
    return;
  }

  dependencyClientWarningLogged = true;
  telemetry.context.warn(
    "Dependency telemetry client unavailable; custom dependency envelopes are not being sent to Application Insights."
  );
}

function flushClient(client) {
  if (!client || typeof client.flush !== "function") {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      resolve();
    };

    const timer = setTimeout(finish, FLUSH_TIMEOUT_MS);

    try {
      client.flush({
        isAppCrashing: false,
        callback: () => {
          clearTimeout(timer);
          finish();
        }
      });
    } catch (_error) {
      clearTimeout(timer);
      finish();
    }
  });
}

async function trackDependency(telemetry, descriptor, operation) {
  const startedAt = Date.now();
  let success = false;
  let resultCode = "UNSET";

  try {
    const result = await operation();
    success = typeof descriptor.isSuccess === "function"
      ? descriptor.isSuccess(result)
      : true;
    resultCode = typeof descriptor.getResultCode === "function"
      ? descriptor.getResultCode(result)
      : (success ? "OK" : "FAILED");
    return result;
  } catch (error) {
    success = false;
    resultCode = String(
      descriptor.errorResultCode ||
      error?.safeCode ||
      error?.code ||
      error?.httpStatus ||
      "EXCEPTION"
    );
    throw error;
  } finally {
    const duration = Date.now() - startedAt;
    const client = getAppInsightsClient();

    if (client) {
      client.trackDependency({
        target: descriptor.target,
        name: descriptor.name,
        data: descriptor.data || descriptor.name,
        duration,
        success,
        resultCode,
        dependencyTypeName: descriptor.dependencyTypeName || "HTTP",
        properties: buildProperties(telemetry, descriptor.properties)
      });

      await flushClient(client);
    } else {
      logClientUnavailable(telemetry);
    }

    logDependency(telemetry, descriptor.name, success, resultCode, duration);
  }
}

module.exports = {
  trackDependency,
  flushClient
};
