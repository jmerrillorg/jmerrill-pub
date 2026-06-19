"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  buildMilestone8DistributionSetupReadiness,
  buildTaskTemplates,
  DISTRIBUTION_GATE_NAME,
  DISTRIBUTION_CHANNELS,
  DISTRIBUTION_PATHS,
  HUMAN_CHECKPOINTS,
  INTERNAL_VISIBILITY_MAILBOX,
  DISTRIBUTION_TASK_ENTITY_SET,
  EVENT_TYPE
} = require("../src/distribution/milestone8DistributionSetupReadiness");

const baseInput = Object.freeze({
  diagnosticId: "64e387e0-7e6a-f111-a826-00224820105b",
  intakeReferenceCode: "JMP-INT-202606-UFYG60",
  opportunity: {
    opportunityId: "2653fca9-eacd-4c44-b3ed-1764dd5d35aa",
    active: true,
    name: "Publishing Intake - Establishing Glory: The Library"
  },
  project: {
    title: "Establishing Glory: The Library"
  },
  author: {
    name: "Jackie Smith Jr"
  },
  production: {
    status: "FILES_APPROVED_FOR_DISTRIBUTION"
  },
  files: {
    printInteriorStatus: "PRINT_INTERIOR_APPROVED",
    ebookStatus: "EBOOK_APPROVED",
    coverStatus: "COVER_APPROVED"
  },
  metadata: {
    title: "Establishing Glory: The Library",
    authorName: "Jackie Smith Jr",
    descriptionStatus: "DESCRIPTION_APPROVED",
    categoryStatus: "CATEGORIES_APPROVED"
  },
  isbn: {
    status: "ISBN_ASSIGNED"
  },
  pricing: {
    status: "PRICING_APPROVED"
  },
  channels: {
    selected: [
      DISTRIBUTION_CHANNELS.INGRAM_PRINT,
      DISTRIBUTION_CHANNELS.EBOOK_RETAIL
    ]
  },
  distributionAuthorization: {
    authorizedBy: "Jackie",
    authorizedAt: "2026-06-19T15:00:00.000Z",
    targetSetupDate: "2026-06-26T15:00:00.000Z"
  },
  distributionGateEnabled: false,
  completedAt: "2026-06-19T15:01:00.000Z"
});

function input(overrides = {}) {
  return {
    ...baseInput,
    ...overrides,
    opportunity: {
      ...baseInput.opportunity,
      ...(overrides.opportunity || {})
    },
    production: {
      ...baseInput.production,
      ...(overrides.production || {})
    },
    files: {
      ...baseInput.files,
      ...(overrides.files || {})
    },
    metadata: {
      ...baseInput.metadata,
      ...(overrides.metadata || {})
    },
    isbn: {
      ...baseInput.isbn,
      ...(overrides.isbn || {})
    },
    pricing: {
      ...baseInput.pricing,
      ...(overrides.pricing || {})
    },
    channels: {
      ...baseInput.channels,
      ...(overrides.channels || {})
    },
    distributionAuthorization: {
      ...baseInput.distributionAuthorization,
      ...(overrides.distributionAuthorization || {})
    }
  };
}

describe("Milestone 8 distribution setup readiness gate", () => {
  test("blocks distribution setup while the distribution gate is false", () => {
    const result = buildMilestone8DistributionSetupReadiness(input());

    assert.equal(result.ok, true);
    assert.equal(result.readiness.distributionGateName, DISTRIBUTION_GATE_NAME);
    assert.equal(result.readiness.distributionGateEnabled, false);
    assert.equal(result.readiness.distributionSetupPermitted, false);
    assert.equal(result.readiness.blockers.includes(`${DISTRIBUTION_GATE_NAME}_FALSE`), true);
    assert.deepEqual(result.taskPayloads, []);
  });

  test("requires production files, metadata, ISBN, pricing, channels, gate, and human authorization", () => {
    const result = buildMilestone8DistributionSetupReadiness(input({
      production: { status: "PRODUCTION_IN_PROGRESS" },
      files: {
        printInteriorStatus: "PRINT_PENDING",
        ebookStatus: "EBOOK_PENDING",
        coverStatus: "COVER_PENDING"
      },
      metadata: {
        title: "",
        authorName: "",
        descriptionStatus: "",
        categoryStatus: ""
      },
      isbn: { status: "ISBN_PENDING" },
      pricing: { status: "PRICING_PENDING" },
      channels: { selected: [] },
      distributionAuthorization: { authorizedBy: "", authorizedAt: "" },
      distributionGateEnabled: false
    }));

    assert.equal(result.ok, true);
    assert.equal(result.readiness.distributionSetupPermitted, false);
    assert.equal(result.readiness.blockers.includes("PRODUCTION_FILES_NOT_READY"), true);
    assert.equal(result.readiness.blockers.includes("TITLE_METADATA_REQUIRED"), true);
    assert.equal(result.readiness.blockers.includes("ISBN_IMPRINT_DECISION_REQUIRED"), true);
    assert.equal(result.readiness.blockers.includes("PRINT_FILE_NOT_APPROVED"), true);
    assert.equal(result.readiness.blockers.includes("EBOOK_FILE_NOT_APPROVED"), true);
    assert.equal(result.readiness.blockers.includes("COVER_FILE_NOT_APPROVED"), true);
    assert.equal(result.readiness.blockers.includes("PRICING_TERRITORY_NOT_APPROVED"), true);
    assert.equal(result.readiness.blockers.includes("DISTRIBUTION_CHANNEL_REQUIRED"), true);
    assert.equal(result.readiness.blockers.includes("HUMAN_DISTRIBUTION_SETUP_AUTHORIZATION_REQUIRED"), true);
  });

  test("permits setup readiness only when all prerequisites and gate are satisfied", () => {
    const result = buildMilestone8DistributionSetupReadiness(input({
      distributionGateEnabled: true
    }));

    assert.equal(result.ok, true);
    assert.equal(result.readiness.distributionSetupPermitted, true);
    assert.deepEqual(result.readiness.blockers, []);
    assert.equal(result.taskPayloads.length, 8);
    assert.equal(result.taskPayloads.every((task) => task.entitySet === DISTRIBUTION_TASK_ENTITY_SET), true);
    assert.equal(result.taskPayloads.every((task) => task.payload.jm1_iscompleted === false), true);
    assert.equal(result.taskPayloads.every((task) => task.payload.jm1_taskname.includes("Establishing Glory")), true);
  });
});

describe("Milestone 8 distribution setup body", () => {
  test("defines the full distribution setup path before launch/release", () => {
    const templates = buildTaskTemplates();
    const paths = templates.map((template) => template.path).sort();

    assert.deepEqual(paths, Object.values(DISTRIBUTION_PATHS).sort());
    assert.equal(templates.length, 8);
    assert.equal(templates.every((template) => template.taskPayloadCreated === false), true);
    assert.equal(templates.every((template) => template.taskCreatedInDataverse === false), true);
  });

  test("keeps human checkpoints explicit and stops before launch/release", () => {
    const result = buildMilestone8DistributionSetupReadiness(input());

    assert.deepEqual(result.readiness.humanCheckpoints, HUMAN_CHECKPOINTS);
    assert.equal(result.readiness.humanCheckpoints.includes("DISTRIBUTION_SETUP_AUTHORIZATION_REVIEW"), true);
    assert.equal(result.readiness.humanCheckpoints.includes("LAUNCH_RELEASE_STOP_REVIEW"), true);
    assert.equal(result.readiness.stopsBefore.includes("LAUNCH_RELEASE"), true);
    assert.equal(result.readiness.stopsBefore.includes("RETAIL_PUBLICATION"), true);
    assert.equal(result.readiness.stopsBefore.includes("ROYALTY_SETUP"), true);
    assert.equal(result.readiness.stopsBefore.includes("POST_RELEASE_MANAGEMENT"), true);
  });

  test("prepares internal visibility and safe execution-log evidence", () => {
    const result = buildMilestone8DistributionSetupReadiness(input());

    assert.equal(result.internalNotification.prepared, true);
    assert.equal(result.internalNotification.to, INTERNAL_VISIBILITY_MAILBOX);
    assert.deepEqual(result.internalNotification.cc, []);
    assert.deepEqual(result.internalNotification.bcc, []);
    assert.equal(result.internalNotification.type, EVENT_TYPE);
    assert.equal(result.payloads.executionLogPayload.jm1_actiontype, EVENT_TYPE);
    assert.equal(result.payloads.executionLogPayload.jm1_actiondescription.includes("No Ingram submission"), true);
  });
});

describe("Milestone 8 safety boundaries", () => {
  test("does not expose live distribution, release, payment, or credential side effects", () => {
    const result = buildMilestone8DistributionSetupReadiness(input({
      distributionGateEnabled: true
    }));

    assert.equal(result.liveActions.createsDistributionTasks, false);
    assert.equal(result.liveActions.submitsToIngram, false);
    assert.equal(result.liveActions.publishesRetailListing, false);
    assert.equal(result.liveActions.setsReleaseDate, false);
    assert.equal(result.liveActions.startsLaunch, false);
    assert.equal(result.liveActions.startsRoyaltySetup, false);
    assert.equal(result.liveActions.startsPostReleaseManagement, false);
    assert.equal(result.liveActions.sendsAuthorEmail, false);
    assert.equal(result.liveActions.createsPaymentLink, false);
    assert.equal(result.liveActions.createsInvoice, false);
    assert.equal(result.liveActions.chargesCard, false);
    assert.equal(result.liveActions.createsDuplicateOpportunity, false);
    assert.equal(result.liveActions.usesQboForNewLogic, false);
    assert.equal(result.liveActions.exposesCredentials, false);
  });

  test("rejects unsafe distribution, launch, royalty, and credential fields without echoing content", () => {
    const result = buildMilestone8DistributionSetupReadiness(input({
      ingramApiKey: "SECRET_KEY",
      project: {
        title: "Project",
        manuscriptText: "UNSAFE MANUSCRIPT"
      }
    }));

    assert.equal(result.ok, false);
    assert.equal(result.reason, "UNSAFE_FIELD_PRESENT");
    assert.equal(JSON.stringify(result).includes("SECRET_KEY"), false);
    assert.equal(JSON.stringify(result).includes("UNSAFE MANUSCRIPT"), false);
  });
});
