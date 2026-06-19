"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  buildMilestone7cEditorialCommandCenter,
  buildTaskTemplates,
  evaluateStageTransition,
  resolveDoctrineOverlay,
  EDITORIAL_GATE_NAME,
  EDITORIAL_STAGES,
  HUMAN_CHECKPOINTS,
  INTERNAL_VISIBILITY_MAILBOX,
  EDITORIAL_TASK_ENTITY_SET,
  EDITORIAL_STAGE_TABLE,
  EDITORIAL_STAGE_SCHEMA_PLAN,
  EDITORIAL_AGENT_READINESS,
  EVENT_TYPE
} = require("../src/editorial/milestone7cEditorialCommandCenter");

const baseInput = Object.freeze({
  diagnosticId: "64e387e0-7e6a-f111-a826-00224820105b",
  intakeReferenceCode: "JMP-INT-202606-UFYG60",
  opportunity: {
    opportunityId: "2653fca9-eacd-4c44-b3ed-1764dd5d35aa",
    active: true,
    authorSelectedPackageCode: "JMP-PKG-PRO",
    packageSelectionStatus: "PACKAGE_SELECTED",
    name: "Publishing Intake - Establishing Glory: The Library"
  },
  project: {
    title: "Establishing Glory: The Library",
    imprintPath: "J_MERRILL"
  },
  author: {
    name: "Jackie Smith Jr"
  },
  package: {
    selectedPackageCode: "JMP-PKG-PRO",
    selectionStatus: "PACKAGE_SELECTED"
  },
  agreement: {
    status: "AGREEMENT_EXECUTED"
  },
  onboarding: {
    status: "ONBOARDING_COMPLETE"
  },
  payment: {
    status: "PAYMENT_RECEIVED"
  },
  editorial: {
    currentStage: EDITORIAL_STAGES.REVIEW,
    assignedOwner: "Jackie",
    assignedEditor: "Editorial Operator",
    dueDate: "2026-06-30T15:00:00.000Z",
    humanReviewStatus: "PENDING",
    authorRevisionStatus: "NOT_REQUESTED",
    proofingStatus: "NOT_STARTED",
    finalEditorialApprovalStatus: "PENDING",
    productionHandoffApproved: false,
    faithContext: true
  },
  artifacts: {
    styleSheetReference: "SharePoint:Titles/EGTL/Editorial/style-sheet",
    editorialDeliverableReference: "SharePoint:Titles/EGTL/Editorial/review-report",
    internalNotesReference: "SharePoint:Titles/EGTL/Editorial/internal-notes",
    evidenceReference: "Dataverse:jm1_executionlogs"
  },
  transition: {
    fromStage: EDITORIAL_STAGES.REVIEW,
    toStage: EDITORIAL_STAGES.DEVELOPMENTAL
  },
  commandCenterGateEnabled: false,
  dataverse: {
    editorialStageTableExists: false
  },
  completedAt: "2026-06-19T16:00:00.000Z"
});

function input(overrides = {}) {
  return {
    ...baseInput,
    ...overrides,
    opportunity: {
      ...baseInput.opportunity,
      ...(overrides.opportunity || {})
    },
    package: {
      ...baseInput.package,
      ...(overrides.package || {})
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
    editorial: {
      ...baseInput.editorial,
      ...(overrides.editorial || {})
    },
    artifacts: {
      ...baseInput.artifacts,
      ...(overrides.artifacts || {})
    },
    transition: {
      ...baseInput.transition,
      ...(overrides.transition || {})
    },
    dataverse: {
      ...baseInput.dataverse,
      ...(overrides.dataverse || {})
    }
  };
}

describe("Milestone 7C editorial command center readiness gate", () => {
  test("blocks live command center readiness while gate and editorial stage schema are missing", () => {
    const result = buildMilestone7cEditorialCommandCenter(input());

    assert.equal(result.ok, true);
    assert.equal(result.readiness.editorialGateName, EDITORIAL_GATE_NAME);
    assert.equal(result.readiness.commandCenterGateEnabled, false);
    assert.equal(result.readiness.editorialStageTableAvailable, false);
    assert.equal(result.readiness.commandCenterReady, false);
    assert.equal(result.readiness.blockers.includes(`${EDITORIAL_GATE_NAME}_FALSE`), true);
    assert.equal(result.readiness.blockers.includes(`${EDITORIAL_STAGE_TABLE}_SCHEMA_NOT_CONFIRMED`), true);
    assert.deepEqual(result.taskPayloads, []);
  });

  test("requires author package, agreement, onboarding, payment, owner, schema, gate, and valid stage", () => {
    const result = buildMilestone7cEditorialCommandCenter(input({
      package: { selectedPackageCode: "", selectionStatus: "PACKAGE_SELECTION_PENDING" },
      agreement: { status: "AGREEMENT_PENDING" },
      onboarding: { status: "ONBOARDING_PENDING" },
      payment: { status: "PAYMENT_PENDING" },
      editorial: { assignedOwner: "", currentStage: "UNKNOWN_STAGE" },
      dataverse: { editorialStageTableExists: false },
      commandCenterGateEnabled: false
    }));

    assert.equal(result.ok, true);
    assert.equal(result.readiness.commandCenterReady, false);
    assert.equal(result.readiness.blockers.includes("AUTHOR_PACKAGE_SELECTION_REQUIRED"), true);
    assert.equal(result.readiness.blockers.includes("AGREEMENT_REQUIREMENT_NOT_SATISFIED"), true);
    assert.equal(result.readiness.blockers.includes("ONBOARDING_REQUIREMENT_NOT_SATISFIED"), true);
    assert.equal(result.readiness.blockers.includes("PAYMENT_OR_WAIVER_REQUIRED"), true);
    assert.equal(result.readiness.blockers.includes("EDITORIAL_OWNER_REQUIRED"), true);
    assert.equal(result.readiness.blockers.includes("CURRENT_EDITORIAL_STAGE_INVALID"), true);
  });

  test("prepares editorial task payloads only when all prerequisites and gate are satisfied", () => {
    const result = buildMilestone7cEditorialCommandCenter(input({
      commandCenterGateEnabled: true,
      dataverse: { editorialStageTableExists: true }
    }));

    assert.equal(result.ok, true);
    assert.equal(result.readiness.commandCenterReady, true);
    assert.deepEqual(result.readiness.blockers, []);
    assert.equal(result.taskPayloads.length, 8);
    assert.equal(result.taskPayloads.every((task) => task.entitySet === EDITORIAL_TASK_ENTITY_SET), true);
    assert.equal(result.taskPayloads.every((task) => task.payload.jm1_iscompleted === false), true);
    assert.equal(result.taskPayloads.every((task) => task.payload.jm1_taskname.includes("Establishing Glory")), true);
  });
});

describe("Milestone 7C editorial body", () => {
  test("defines the required editorial stages and human checkpoints", () => {
    const result = buildMilestone7cEditorialCommandCenter(input());

    assert.deepEqual(result.readiness.stages.sort(), Object.values(EDITORIAL_STAGES).sort());
    assert.equal(result.readiness.stages.includes(EDITORIAL_STAGES.REVIEW), true);
    assert.equal(result.readiness.stages.includes(EDITORIAL_STAGES.DEVELOPMENTAL), true);
    assert.equal(result.readiness.stages.includes(EDITORIAL_STAGES.LINE), true);
    assert.equal(result.readiness.stages.includes(EDITORIAL_STAGES.COPYEDIT), true);
    assert.equal(result.readiness.stages.includes(EDITORIAL_STAGES.PROOFREAD), true);
    assert.equal(result.readiness.stages.includes(EDITORIAL_STAGES.AUTHOR_REVISION), true);
    assert.equal(result.readiness.stages.includes(EDITORIAL_STAGES.HOLD_BLOCKED), true);
    assert.equal(result.readiness.stages.includes(EDITORIAL_STAGES.COMPLETE_READY_FOR_PRODUCTION_HANDOFF), true);
    assert.deepEqual(result.readiness.humanCheckpoints, HUMAN_CHECKPOINTS);
  });

  test("defines editorial task templates without creating Dataverse tasks", () => {
    const templates = buildTaskTemplates();

    assert.equal(templates.length, 8);
    assert.equal(templates.every((template) => template.entitySet === EDITORIAL_TASK_ENTITY_SET), true);
    assert.equal(templates.some((template) => template.taskCode === "M7C-AUTHOR-REVISION"), true);
    assert.equal(templates.some((template) => template.taskCode === "M7C-PRODUCTION-HANDOFF"), true);
    assert.equal(templates.every((template) => template.taskCreatedInDataverse === false), true);
  });

  test("prepares a safe editorial queue item and internal visibility payload", () => {
    const result = buildMilestone7cEditorialCommandCenter(input());

    assert.equal(result.editorialQueueItem.intakeReferenceCode, "JMP-INT-202606-UFYG60");
    assert.equal(result.editorialQueueItem.currentProductionPhase, "J3_EDITORIAL_COMMAND_CENTER");
    assert.equal(result.editorialQueueItem.assignedOwner, "Jackie");
    assert.equal(result.editorialQueueItem.productionHandoffReadiness, "NOT_READY");
    assert.equal(result.internalNotification.prepared, true);
    assert.equal(result.internalNotification.to, INTERNAL_VISIBILITY_MAILBOX);
    assert.deepEqual(result.internalNotification.cc, []);
    assert.deepEqual(result.internalNotification.bcc, []);
    assert.equal(result.internalNotification.type, EVENT_TYPE);
    assert.equal(result.payloads.executionLogPayload.jm1_actiontype, EVENT_TYPE);
  });

  test("records the missing editorial stage table as a schema plan instead of bypassing it", () => {
    const result = buildMilestone7cEditorialCommandCenter(input());

    assert.equal(result.schemaPlan.table, EDITORIAL_STAGE_TABLE);
    assert.equal(result.schemaPlan.currentStatus, "MISSING_IN_DATAVERSE");
    assert.deepEqual(result.schemaPlan, EDITORIAL_STAGE_SCHEMA_PLAN);
    assert.equal(result.schemaPlan.requiredBeforeLiveTrackerActivation, true);
    assert.equal(result.schemaPlan.fields.includes("jm1pub_stylesheeturl"), true);
    assert.equal(result.schemaPlan.fields.includes("jm1pub_deliverableurl"), true);
  });
});

describe("Milestone 7C stage transitions and handoff", () => {
  test("allows canonical editorial stage movement and author revision return paths", () => {
    assert.equal(evaluateStageTransition({
      fromStage: EDITORIAL_STAGES.REVIEW,
      toStage: EDITORIAL_STAGES.DEVELOPMENTAL
    }).allowed, true);
    assert.equal(evaluateStageTransition({
      fromStage: EDITORIAL_STAGES.DEVELOPMENTAL,
      toStage: EDITORIAL_STAGES.AUTHOR_REVISION
    }).allowed, true);
    assert.equal(evaluateStageTransition({
      fromStage: EDITORIAL_STAGES.AUTHOR_REVISION,
      toStage: EDITORIAL_STAGES.LINE
    }).allowed, true);
    assert.equal(evaluateStageTransition({
      fromStage: EDITORIAL_STAGES.HOLD_BLOCKED,
      toStage: EDITORIAL_STAGES.COPYEDIT
    }).allowed, true);
  });

  test("blocks movement out of complete handoff and invalid stage jumps", () => {
    assert.equal(evaluateStageTransition({
      fromStage: EDITORIAL_STAGES.COMPLETE_READY_FOR_PRODUCTION_HANDOFF,
      toStage: EDITORIAL_STAGES.LINE
    }).allowed, false);
    assert.equal(evaluateStageTransition({
      fromStage: EDITORIAL_STAGES.DEVELOPMENTAL,
      toStage: EDITORIAL_STAGES.PROOFREAD
    }).allowed, false);
  });

  test("requires style sheet and final approval before production handoff can be ready", () => {
    const blocked = buildMilestone7cEditorialCommandCenter(input({
      editorial: {
        currentStage: EDITORIAL_STAGES.COMPLETE_READY_FOR_PRODUCTION_HANDOFF,
        finalEditorialApprovalStatus: "APPROVED",
        productionHandoffApproved: true
      },
      artifacts: { styleSheetReference: "" },
      commandCenterGateEnabled: true,
      dataverse: { editorialStageTableExists: true }
    }));
    assert.equal(blocked.readiness.productionHandoffReady, false);
    assert.equal(blocked.readiness.blockers.includes("STYLE_SHEET_REQUIRED_BEFORE_FINAL_HANDOFF"), true);

    const ready = buildMilestone7cEditorialCommandCenter(input({
      editorial: {
        currentStage: EDITORIAL_STAGES.COMPLETE_READY_FOR_PRODUCTION_HANDOFF,
        finalEditorialApprovalStatus: "APPROVED",
        productionHandoffApproved: true
      },
      artifacts: { styleSheetReference: "SharePoint:style-sheet" },
      transition: {
        fromStage: EDITORIAL_STAGES.PROOFREAD,
        toStage: EDITORIAL_STAGES.COMPLETE_READY_FOR_PRODUCTION_HANDOFF
      },
      commandCenterGateEnabled: true,
      dataverse: { editorialStageTableExists: true }
    }));
    assert.equal(ready.readiness.productionHandoffReady, true);
    assert.equal(ready.editorialQueueItem.productionHandoffReadiness, "READY");
  });
});

describe("Milestone 7C doctrine and agent boundaries", () => {
  test("applies faith overlay internally only when project context qualifies", () => {
    const faith = resolveDoctrineOverlay(input());
    assert.equal(faith.applies, true);
    assert.equal(faith.internalOnly, true);
    assert.equal(faith.authorFacingReferencePermitted, false);
    assert.equal(faith.overlays.includes("FAITH_INSPIRATIONAL"), true);

    const nonFaith = resolveDoctrineOverlay(input({
      project: { title: "General Trade Title", imprintPath: "GENERAL_TRADE" },
      editorial: { faithContext: false, childrenContext: false, streetLitContext: false }
    }));
    assert.equal(nonFaith.applies, false);
    assert.deepEqual(nonFaith.overlays, []);
    assert.equal(nonFaith.doNotOverApplyToNonFaithTitles, true);
  });

  test("keeps the future editorial agent proposed, supervised, and unable to send author output", () => {
    const result = buildMilestone7cEditorialCommandCenter(input());

    assert.deepEqual(result.editorialAgentReadiness, EDITORIAL_AGENT_READINESS);
    assert.equal(result.editorialAgentReadiness.status, "PROPOSED_NOT_ACTIVE");
    assert.equal(result.editorialAgentReadiness.humanApprovalRequired, true);
    assert.equal(result.editorialAgentReadiness.autonomousManuscriptRewritePermitted, false);
    assert.equal(result.editorialAgentReadiness.autonomousAuthorDeliveryPermitted, false);
    assert.equal(result.editorialAgentReadiness.rawManuscriptLoggingPermitted, false);
  });
});

describe("Milestone 7C safety boundaries", () => {
  test("does not expose editorial, production, distribution, launch, royalty, payment, or credential side effects", () => {
    const result = buildMilestone7cEditorialCommandCenter(input({
      commandCenterGateEnabled: true,
      dataverse: { editorialStageTableExists: true }
    }));

    assert.equal(result.liveActions.createsEditorialStageRows, false);
    assert.equal(result.liveActions.createsPublishingTasks, false);
    assert.equal(result.liveActions.runsEditorialAgent, false);
    assert.equal(result.liveActions.performsEditorialJudgment, false);
    assert.equal(result.liveActions.rewritesManuscript, false);
    assert.equal(result.liveActions.sendsAuthorFacingEditorialContent, false);
    assert.equal(result.liveActions.sendsAuthorEmail, false);
    assert.equal(result.liveActions.activatesFlowD, false);
    assert.equal(result.liveActions.startsProduction, false);
    assert.equal(result.liveActions.assignsIsbn, false);
    assert.equal(result.liveActions.startsDistributionSetup, false);
    assert.equal(result.liveActions.submitsToIngram, false);
    assert.equal(result.liveActions.publishesRetailListing, false);
    assert.equal(result.liveActions.startsLaunchRelease, false);
    assert.equal(result.liveActions.startsRoyaltySetup, false);
    assert.equal(result.liveActions.createsDuplicateOpportunity, false);
    assert.equal(result.liveActions.usesQboForNewLogic, false);
    assert.equal(result.liveActions.exposesCredentials, false);
  });

  test("rejects unsafe manuscript, author-delivery, launch, and credential fields without echoing content", () => {
    const result = buildMilestone7cEditorialCommandCenter(input({
      manuscriptText: "UNSAFE MANUSCRIPT",
      project: {
        title: "Project",
        rawModelOutput: "UNSAFE MODEL OUTPUT"
      },
      headers: {
        authorization: "SECRET_TOKEN"
      }
    }));

    assert.equal(result.ok, false);
    assert.equal(result.reason, "UNSAFE_FIELD_PRESENT");
    assert.equal(JSON.stringify(result).includes("UNSAFE MANUSCRIPT"), false);
    assert.equal(JSON.stringify(result).includes("UNSAFE MODEL OUTPUT"), false);
    assert.equal(JSON.stringify(result).includes("SECRET_TOKEN"), false);
  });
});
