"use strict";

const { randomUUID } = require("node:crypto");
const {
  ALLOWED_CAPABILITIES,
  IDENTITY,
  OBJECTIVE,
  authorizeCapability
} = require("./publishingAgentPolicy");

const CONTRACT_VERSION = "JM1-PUBLISHING-AGENT-READ-v1.0.0";
const REGISTRY_VERSION = "JM1-AGENT-CAPABILITY-REGISTRY-v1.0.0";

function requiredText(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    const error = new Error(`${field} is required`);
    error.code = "AMBIGUOUS_INPUT";
    throw error;
  }
  return value.trim();
}

function summarizeCandidate(candidate) {
  if (!candidate) return null;
  return {
    WORK_ID: candidate.WORK_ID,
    TITLE: candidate.TITLE,
    CURRENT_STATE: candidate.CURRENT_STATE,
    CURRENT_WAIT_STATE: candidate.CURRENT_WAIT_STATE || null,
    NEXT_CERTIFIED_WORK_CLASS: candidate.NEXT_CERTIFIED_WORK_CLASS || null,
    BLOCKER: candidate.BLOCKER || null,
    HUMAN_AUTHORITY_REQUIRED: candidate.HUMAN_AUTHORITY_REQUIRED || null,
    WHY_SELECTED: candidate.WHY_SELECTED || null
  };
}

function createPublishingReadOnlyOrchestrator({
  inspectTitleState,
  discoverNextWork,
  auditSink,
  clock = () => new Date().toISOString(),
  runIdFactory = () => randomUUID()
}) {
  if (typeof inspectTitleState !== "function" || typeof discoverNextWork !== "function") {
    throw new TypeError("Both allowlisted Publishing tool implementations are required.");
  }
  if (typeof auditSink !== "function") {
    throw new TypeError("A durable audit sink is required.");
  }

  async function run(request) {
    let objective = request?.objective || null;
    let inputReference = request?.inputReference || null;
    const identity = request?.identity || IDENTITY;
    const runId = runIdFactory();
    const startedAt = clock();
    const toolCalls = [];
    const policyDecisions = [];
    const deniedToolAttempts = [];

    const invoke = async (capabilityId, input, tool) => {
      try {
        const decision = authorizeCapability({ capabilityId, identity, objective });
        policyDecisions.push(decision);
      } catch (error) {
        deniedToolAttempts.push({ capabilityId, code: error.code || "POLICY_DENIED" });
        throw error;
      }
      const calledAt = clock();
      const result = await tool(input);
      toolCalls.push({ capabilityId, contractVersion: CONTRACT_VERSION, calledAt, resultClass: result.RESULT_CLASS || "OBSERVATION" });
      return result;
    };

    let finalResult;
    let errors = [];
    try {
      objective = requiredText(objective, "objective");
      inputReference = requiredText(inputReference, "inputReference");
      const observation = await invoke(
        "PUBLISHING.INSPECT_TITLE_STATE",
        { inputReference },
        inspectTitleState
      );
      const authoritativeStateVersion = requiredText(observation.AUTHORITATIVE_STATE_VERSION, "AUTHORITATIVE_STATE_VERSION");
      const discovery = await invoke(
        "PUBLISHING.DISCOVER_NEXT_WORK",
        { inputReference, authoritativeStateVersion, observation },
        discoverNextWork
      );

      if (discovery.AUTHORITATIVE_STATE_VERSION !== authoritativeStateVersion) {
        finalResult = {
          STATUS: "STALE_STATE",
          RECOMMENDATION: null,
          ESCALATION: "RE_READ_AUTHORITATIVE_STATE",
          WORK_CANDIDATES: []
        };
      } else {
        const candidates = (discovery.WORK_CANDIDATES || []).map(summarizeCandidate);
        finalResult = {
          STATUS: discovery.STATUS || (candidates.length ? "RECOMMENDATION_READY" : "NO_ELIGIBLE_WORK"),
          RECOMMENDATION: summarizeCandidate(
            Object.prototype.hasOwnProperty.call(discovery, "RECOMMENDATION")
              ? discovery.RECOMMENDATION
              : candidates[0]
          ),
          ESCALATION: discovery.ESCALATION || null,
          WORK_CANDIDATES: candidates
        };
      }
    } catch (error) {
      errors = [{ code: error.code || "TOOL_FAILURE", message: error.message }];
      finalResult = {
        STATUS: error.code || "TOOL_FAILURE",
        RECOMMENDATION: null,
        ESCALATION: error.code === "TOOL_FAILURE" ? "OWNING_DOMAIN_EXCEPTION_PATH" : null,
        WORK_CANDIDATES: []
      };
    }

    const trace = {
      AGENT_RUN_ID: runId,
      OBJECTIVE: objective,
      IDENTITY: identity,
      START_TIME: startedAt,
      END_TIME: clock(),
      TOOL_CALLS: toolCalls,
      CAPABILITY_IDS: toolCalls.map((call) => call.capabilityId),
      INPUT_REFERENCE: inputReference,
      OUTPUT_SUMMARY: finalResult.STATUS,
      POLICY_DECISIONS: policyDecisions,
      DENIED_TOOL_ATTEMPTS: deniedToolAttempts,
      WORK_CANDIDATES: finalResult.WORK_CANDIDATES,
      FINAL_RECOMMENDATION: finalResult.RECOMMENDATION,
      ESCALATION: finalResult.ESCALATION,
      ERRORS: errors,
      TOOL_CONTRACT_VERSION: CONTRACT_VERSION,
      CAPABILITY_REGISTRY_VERSION: REGISTRY_VERSION,
      AUTHORIZED_CAPABILITIES: ALLOWED_CAPABILITIES,
      BUSINESS_EFFECTS: 0
    };
    await auditSink(trace);

    return { ...finalResult, AGENT_RUN_ID: runId, TRACE: trace };
  }

  return { run };
}

module.exports = {
  CONTRACT_VERSION,
  REGISTRY_VERSION,
  createPublishingReadOnlyOrchestrator
};
