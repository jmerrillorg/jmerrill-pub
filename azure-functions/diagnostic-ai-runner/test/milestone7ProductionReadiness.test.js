"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  buildMilestone7ProductionReadiness,
  buildTaskTemplates,
  PRODUCTION_GATE_NAME,
  PRODUCTION_PATHS,
  HUMAN_CHECKPOINTS,
  INTERNAL_VISIBILITY_MAILBOX,
  PRODUCTION_TASK_ENTITY_SET,
  EVENT_TYPE
} = require("../src/production/milestone7ProductionReadiness");

const baseInput = Object.freeze({
  diagnosticId: "64e387e0-7e6a-f111-a826-00224820105b",
  intakeReferenceCode: "JMP-INT-202606-UFYG60",
  opportunity: {
    opportunityId: "2653fca9-eacd-4c44-b3ed-1764dd5d35aa",
    active: true,
    name: "Publishing Intake - Establishing Glory: The Library",
    stepName: "2-Develop",
    authorSelectedPackageCode: "JMP-PKG-PRO",
    packageSelectionStatus: "PACKAGE_SELECTED"
  },
  project: {
    title: "Establishing Glory: The Library"
  },
  author: {
    name: "Jackie Smith Jr"
  },
  agreement: {
    status: "AGREEMENT_EXECUTED"
  },
  onboarding: {
    status: "ONBOARDING_COMPLETE"
  },
  payment: {
    status: "PAYMENT_REQUIREMENT_SATISFIED"
  },
  productionAuthorization: {
    authorizedBy: "Jackie",
    authorizedAt: "2026-06-19T14:00:00.000Z",
    targetStartDate: "2026-06-24T14:00:00.000Z"
  },
  productionGateEnabled: false,
  completedAt: "2026-06-19T14:01:00.000Z"
});

function input(overrides = {}) {
  return {
    ...baseInput,
    ...overrides,
    opportunity: {
      ...baseInput.opportunity,
      ...(overrides.opportunity || {})
    },
    agreement: {
      ...baseInput.agreement,
      ...(overrides.agreement || {})
    },
    onboarding: {
      ...baseInput.onboarding,
      ...(overrides.onboarding || {})
    },
    payment: {
      ...baseInput.payment,
      ...(overrides.payment || {})
    },
    productionAuthorization: {
      ...baseInput.productionAuthorization,
      ...(overrides.productionAuthorization || {})
    }
  };
}

describe("Milestone 7 production readiness gate", () => {
  test("blocks production start while the production authorization gate is false", () => {
    const result = buildMilestone7ProductionReadiness(input());

    assert.equal(result.ok, true);
    assert.equal(result.readiness.productionGateName, PRODUCTION_GATE_NAME);
    assert.equal(result.readiness.productionGateEnabled, false);
    assert.equal(result.readiness.productionStartPermitted, false);
    assert.equal(result.readiness.blockers.includes(`${PRODUCTION_GATE_NAME}_FALSE`), true);
    assert.deepEqual(result.taskPayloads, []);
  });

  test("requires package selection, agreement, onboarding, payment/waiver, gate, and human authorization", () => {
    const result = buildMilestone7ProductionReadiness(input({
      opportunity: {
        authorSelectedPackageCode: "",
        packageSelectionStatus: "PACKAGE_SELECTION_PENDING"
      },
      agreement: { status: "AGREEMENT_PREPARATION_READY" },
      onboarding: { status: "ONBOARDING_PENDING_PACKAGE_SELECTION" },
      payment: { status: "PAYMENT_OPTIONS_PENDING_AUTHOR_SELECTION" },
      productionAuthorization: { authorizedBy: "", authorizedAt: "" },
      productionGateEnabled: false
    }));

    assert.equal(result.ok, true);
    assert.equal(result.readiness.productionStartPermitted, false);
    assert.equal(result.readiness.blockers.includes("AUTHOR_PACKAGE_SELECTION_REQUIRED"), true);
    assert.equal(result.readiness.blockers.includes("AGREEMENT_REQUIREMENT_NOT_SATISFIED"), true);
    assert.equal(result.readiness.blockers.includes("ONBOARDING_REQUIREMENT_NOT_SATISFIED"), true);
    assert.equal(result.readiness.blockers.includes("PAYMENT_OR_WAIVER_REQUIRED"), true);
    assert.equal(result.readiness.blockers.includes("HUMAN_PRODUCTION_AUTHORIZATION_REQUIRED"), true);
  });

  test("permits readiness only when all author-specific prerequisites and gate are satisfied", () => {
    const result = buildMilestone7ProductionReadiness(input({
      productionGateEnabled: true
    }));

    assert.equal(result.ok, true);
    assert.equal(result.readiness.productionStartPermitted, true);
    assert.deepEqual(result.readiness.blockers, []);
    assert.equal(result.taskPayloads.length, 4);
    assert.equal(result.taskPayloads.every((task) => task.entitySet === PRODUCTION_TASK_ENTITY_SET), true);
    assert.equal(result.taskPayloads.every((task) => task.payload.jm1_iscompleted === false), true);
    assert.equal(result.taskPayloads.every((task) => task.payload.jm1_taskname.includes("Establishing Glory")), true);
  });
});

describe("Milestone 7 production paths and checkpoints", () => {
  test("defines editorial, design/cover/layout, proofing, and file-readiness paths", () => {
    const templates = buildTaskTemplates();
    const paths = templates.map((template) => template.path).sort();

    assert.deepEqual(paths, [
      PRODUCTION_PATHS.DESIGN_COVER_LAYOUT,
      PRODUCTION_PATHS.EDITORIAL,
      PRODUCTION_PATHS.FILE_READINESS,
      PRODUCTION_PATHS.PROOFING
    ].sort());
    assert.equal(templates.every((template) => template.taskPayloadCreated === false), true);
    assert.equal(templates.every((template) => template.taskCreatedInDataverse === false), true);
  });

  test("keeps human checkpoints explicit and stops before distribution/release", () => {
    const result = buildMilestone7ProductionReadiness(input());

    assert.deepEqual(result.readiness.humanCheckpoints, HUMAN_CHECKPOINTS);
    assert.equal(result.readiness.humanCheckpoints.includes("PRODUCTION_AUTHORIZATION_REVIEW"), true);
    assert.equal(result.readiness.humanCheckpoints.includes("DISTRIBUTION_RELEASE_STOP_REVIEW"), true);
    assert.equal(result.readiness.stopsBefore.includes("DISTRIBUTION_SETUP"), true);
    assert.equal(result.readiness.stopsBefore.includes("RELEASE_LAUNCH"), true);
    assert.equal(result.readiness.stopsBefore.includes("ROYALTY_SETUP"), true);
    assert.equal(result.readiness.stopsBefore.includes("POST_RELEASE_MANAGEMENT"), true);
  });

  test("prepares internal visibility and safe execution-log evidence", () => {
    const result = buildMilestone7ProductionReadiness(input());

    assert.equal(result.internalNotification.prepared, true);
    assert.equal(result.internalNotification.to, INTERNAL_VISIBILITY_MAILBOX);
    assert.deepEqual(result.internalNotification.cc, []);
    assert.deepEqual(result.internalNotification.bcc, []);
    assert.equal(result.internalNotification.type, EVENT_TYPE);
    assert.equal(result.payloads.executionLogPayload.jm1_actiontype, EVENT_TYPE);
    assert.equal(result.payloads.executionLogPayload.jm1_actiondescription.includes("No Flow D activation"), true);
  });
});

describe("Milestone 7 safety boundaries", () => {
  test("does not expose live production side effects", () => {
    const result = buildMilestone7ProductionReadiness(input({
      productionGateEnabled: true
    }));

    assert.equal(result.liveActions.createsProductionTasks, false);
    assert.equal(result.liveActions.startsProductionWork, false);
    assert.equal(result.liveActions.activatesFlowD, false);
    assert.equal(result.liveActions.assignsIsbn, false);
    assert.equal(result.liveActions.startsEditing, false);
    assert.equal(result.liveActions.startsLayout, false);
    assert.equal(result.liveActions.startsCoverDesign, false);
    assert.equal(result.liveActions.startsDistribution, false);
    assert.equal(result.liveActions.startsRelease, false);
    assert.equal(result.liveActions.startsRoyaltySetup, false);
    assert.equal(result.liveActions.sendsAuthorEmail, false);
    assert.equal(result.liveActions.sendsContract, false);
    assert.equal(result.liveActions.createsPaymentLink, false);
    assert.equal(result.liveActions.createsInvoice, false);
    assert.equal(result.liveActions.chargesCard, false);
    assert.equal(result.liveActions.createsDuplicateOpportunity, false);
    assert.equal(result.liveActions.usesQboForNewLogic, false);
  });

  test("rejects unsafe production, distribution, release, and secret fields without echoing content", () => {
    const result = buildMilestone7ProductionReadiness(input({
      startDistribution: true,
      project: {
        title: "Project",
        manuscriptText: "UNSAFE MANUSCRIPT"
      }
    }));

    assert.equal(result.ok, false);
    assert.equal(result.reason, "UNSAFE_FIELD_PRESENT");
    assert.equal(JSON.stringify(result).includes("UNSAFE MANUSCRIPT"), false);
  });
});
