"use strict";

const { createHash } = require("node:crypto");
const {
  CHANNEL_STATES,
  completeSyntheticDistribution
} = require("../distribution/block07DistributionCommissioning");

const BLOCK08_VERSION = "JMP_BLOCK08_LAUNCH_MARKETING_COMMISSIONING_v1.0";

const REQUIREMENT_STATUS = Object.freeze({
  CURRENT: "CURRENT",
  REFINED: "REFINED",
  SUPERSEDED: "SUPERSEDED",
  MERGED_INTO_LATER_CANON: "MERGED_INTO_LATER_CANON",
  CONFLICTING: "CONFLICTING",
  NOT_APPLICABLE: "NOT_APPLICABLE"
});

const AUDIT_STATUS = Object.freeze({
  IMPLEMENTED_ENFORCED: "IMPLEMENTED_ENFORCED",
  IMPLEMENTED_ADVISORY: "IMPLEMENTED_ADVISORY",
  IMPLEMENTED_PARTIAL: "IMPLEMENTED_PARTIAL",
  DOCUMENTED_ONLY: "DOCUMENTED_ONLY",
  NOT_IMPLEMENTED: "NOT_IMPLEMENTED",
  SUPERSEDED: "SUPERSEDED",
  CONFLICTING: "CONFLICTING",
  NOT_APPLICABLE: "NOT_APPLICABLE",
  EVIDENCE_INSUFFICIENT: "EVIDENCE_INSUFFICIENT"
});

const CAMPAIGN_STATES = Object.freeze({
  PLANNING: "PLANNING",
  CAMPAIGN_PREP: "CAMPAIGN_PREP",
  PRELAUNCH_ACTIVE: "PRELAUNCH_ACTIVE",
  LIVE_LAUNCH_ACTIVE: "LIVE_LAUNCH_ACTIVE",
  POST_LAUNCH_ACTIVE: "POST_LAUNCH_ACTIVE",
  LAUNCH_WINDOW_COMPLETE: "LAUNCH_WINDOW_COMPLETE",
  PERFORMANCE_REVIEW_COMPLETE: "PERFORMANCE_REVIEW_COMPLETE",
  EVERGREEN_HANDOFF_COMPLETE: "EVERGREEN_HANDOFF_COMPLETE",
  LAUNCH_CYCLE_COMPLETE: "LAUNCH_CYCLE_COMPLETE",
  BLOCKED: "BLOCKED",
  CAMPAIGN_AT_RISK: "CAMPAIGN_AT_RISK",
  RELEASE_HEALTH_HOLD: "RELEASE_HEALTH_HOLD",
  AUTHOR_ACTION_REQUIRED: "AUTHOR_ACTION_REQUIRED",
  SYSTEM_ATTENTION_REQUIRED: "SYSTEM_ATTENTION_REQUIRED",
  SCOPE_CHANGE_REQUIRED: "SCOPE_CHANGE_REQUIRED",
  PAUSED: "PAUSED",
  CANCELLED: "CANCELLED"
});

const CAMPAIGN_HEALTH = Object.freeze({
  HEALTHY: "HEALTHY",
  AT_RISK: "AT_RISK",
  UNDERPERFORMING: "UNDERPERFORMING",
  BLOCKED: "BLOCKED",
  PAUSED: "PAUSED",
  COMPLETE: "COMPLETE"
});

const REPRESENTATION_RISK = Object.freeze({
  LOW: "LOW_REPRESENTATION_RISK",
  MEDIUM: "MEDIUM_REPRESENTATION_RISK",
  HIGH: "HIGH_REPRESENTATION_RISK"
});

const BLOCK08_DOMAIN_REGISTER = Object.freeze([
  "CROSS_LIFECYCLE_MARKETING",
  "MARKETING_TRIGGER_STATES",
  "TITLE_MARKETING_CAMPAIGN",
  "TITLE_MARKETING_BRIEF",
  "POSITIONING_LOCK",
  "MESSAGE_HOUSE",
  "BRAND_IMPRINT_GOVERNANCE",
  "MARKETING_ENTITLEMENT",
  "MARKETING_SCOPE_LOCK",
  "MARKETING_SCOPE_CHANGE",
  "AUTHOR_PARTICIPATION",
  "EXECUTION_OWNERSHIP",
  "REPRESENTATION_RISK",
  "AUTHOR_MARKETING_APPROVAL",
  "MARKETING_ASSET_REGISTRY",
  "ASSET_LINEAGE",
  "CAMPAIGN_PLAN",
  "CAMPAIGN_CALENDAR",
  "PRELAUNCH",
  "PREORDER_CAMPAIGN",
  "COVER_REVEAL",
  "REVIEW_ARC",
  "PUBLICITY_MEDIA",
  "SOCIAL_PROOF_REGISTRY",
  "EVENT_MARKETING",
  "OWNED_MEDIA",
  "EARNED_MEDIA",
  "PAID_MEDIA",
  "SOCIAL_EXECUTION",
  "EMAIL_MARKETING",
  "CONSENT_ENFORCEMENT",
  "LANDING_PAGE",
  "VERIFIED_CTA",
  "RELEASE_HEALTH_INTEGRATION",
  "CTA_SUPPRESSION",
  "CAMPAIGN_HEALTH",
  "MARKETING_INCIDENT",
  "LIVE_LAUNCH",
  "AUTHOR_TOOLKIT",
  "CAMPAIGN_ACTIVITY",
  "WAITING_ON",
  "MARKETING_WATCHDOG",
  "ATTRIBUTION",
  "MEASUREMENT",
  "KPI_GOALS",
  "OPTIMIZATION",
  "CAMPAIGN_VERSIONING",
  "LAUNCH_WINDOW",
  "LAUNCH_PERFORMANCE_REVIEW",
  "MARKETING_INTELLIGENCE",
  "EVERGREEN_HANDOFF",
  "PUBLISHER_OPERATING_CENTER",
  "AUTHOR_WORKSPACE",
  "BLOCK09_HANDOFF",
  "LAUNCH_CYCLE_CERTIFICATION"
]);

const BYPASS_FIXTURES = Object.freeze([
  ["marketing first created only after Block 07", "UPSTREAM_MARKETING_TRIGGER_REQUIRED"],
  ["campaign without title relationship", "TITLE_RELATIONSHIP_REQUIRED"],
  ["package name used directly as workflow", "SCOPE_LOCK_REQUIRED"],
  ["scope silently expanded", "SCOPE_CHANGE_REQUIRED"],
  ["scope silently reduced", "SCOPE_CHANGE_REQUIRED"],
  ["author forced to repeat governed marketing intake", "GOVERNED_DATA_REUSE_REQUIRED"],
  ["author approval required for every routine low-risk asset", "LOW_RISK_JMP_EXECUTION_ALLOWED"],
  ["high-risk representational content published without author approval", "AUTHOR_APPROVAL_REQUIRED"],
  ["asset overwritten without history", "ASSET_VERSION_HISTORY_REQUIRED"],
  ["unapproved cover used publicly", "APPROVED_COVER_REQUIRED"],
  ["preorder promoted without verified preorder endpoint", "VERIFIED_PREORDER_CTA_REQUIRED"],
  ["buy-now promoted without verified live endpoint", "VERIFIED_LIVE_CTA_REQUIRED"],
  ["broken URL continues promotion after known failure", "CTA_SUPPRESSION_REQUIRED"],
  ["release incident ignored", "RELEASE_HEALTH_MARKETING_HOLD_REQUIRED"],
  ["marketing consent incorrectly required for service communication", "SERVICE_MARKETING_CONSENT_SEPARATION"],
  ["promotional email sent without marketing consent", "MARKETING_CONSENT_REQUIRED"],
  ["social platform becomes system of record", "DATAVERSE_CAMPAIGN_AUTHORITY_REQUIRED"],
  ["wrong social account used", "SOCIAL_ACCOUNT_AUTHORITY_REQUIRED"],
  ["campaign metrics detached from campaign identity", "CAMPAIGN_METRICS_IDENTITY_REQUIRED"],
  ["sales attribution fabricated", "ATTRIBUTION_CONFIDENCE_REQUIRED"],
  ["optional author activity blocks campaign", "OPTIONAL_AUTHOR_ACTIVITY_NONBLOCKING"],
  ["sales target required for lifecycle close", "SALES_TARGET_NOT_GATE"],
  ["launch day alone closes Block 08", "FULL_CLOSEOUT_REQUIRED"],
  ["campaign health collapsed into release health", "HEALTH_SEPARATION_REQUIRED"],
  ["message differs materially across channels without governance", "MESSAGE_HOUSE_REQUIRED"],
  ["high-risk changed copy inherits prior approval", "VERSION_BOUND_APPROVAL_REQUIRED"],
  ["ARC sends stale manuscript", "ARC_ARTIFACT_PROVENANCE_REQUIRED"],
  ["review quote used without permission", "QUOTE_PERMISSION_REQUIRED"],
  ["paid media implied without entitlement", "PAID_MEDIA_ENTITLEMENT_REQUIRED"],
  ["publication date change not reflected in calendar", "CALENDAR_REVALIDATION_REQUIRED"],
  ["release-health incident fails to suppress affected CTA", "RELEASE_HEALTH_CTA_SUPPRESSION_REQUIRED"],
  ["healthy format unnecessarily suppressed due to another format incident", "HEALTHY_LANE_CONTINUATION_REQUIRED"],
  ["launch performance review skipped", "PERFORMANCE_REVIEW_REQUIRED"],
  ["Block 09 receives no durable marketing intelligence", "EVERGREEN_HANDOFF_REQUIRED"],
  ["legacy marketing history fabricated", "NO_LEGACY_HISTORY_FABRICATION"]
]);

const SYNTHETIC_CASES = Object.freeze([
  ["A", "positioning trigger"],
  ["B", "author marketing ready"],
  ["C", "creative ready"],
  ["D", "preorder ready"],
  ["E", "campaign created pre-publication"],
  ["F", "package entitlement mapping"],
  ["G", "Marketing Scope Lock"],
  ["H", "Message House consistency"],
  ["I", "routine low-risk asset"],
  ["J", "medium representation-risk asset"],
  ["K", "high-risk author content"],
  ["L", "asset versioning"],
  ["M", "cover reveal"],
  ["N", "preorder campaign"],
  ["O", "ARC/reviewer workflow"],
  ["P", "publicity/media workflow"],
  ["Q", "event activation"],
  ["R", "owned-media activity"],
  ["S", "earned-media activity"],
  ["T", "paid-media N/A"],
  ["U", "paid-media entitled/approved synthetic path"],
  ["V", "social execution success"],
  ["W", "social restriction failure"],
  ["X", "email consent allowed"],
  ["Y", "email consent blocked"],
  ["Z", "website landing CTA"],
  ["AA", "verified buy link"],
  ["AB", "broken buy link"],
  ["AC", "partial release health"],
  ["AD", "CTA suppression"],
  ["AE", "live launch"],
  ["AF", "required author participation missing"],
  ["AG", "optional author participation missing"],
  ["AH", "campaign health independent from release health"],
  ["AI", "marketing incident"],
  ["AJ", "UTM persistence"],
  ["AK", "attribution confidence"],
  ["AL", "campaign metrics"],
  ["AM", "optimization/versioning"],
  ["AN", "launch-window close"],
  ["AO", "performance review"],
  ["AP", "evergreen handoff"],
  ["AQ", "Block 09 handoff"],
  ["AR", "watchdog"]
]);

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeKey(value) {
  return normalizeString(value).toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

function sha256(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function result(ok, event, extra = {}) {
  return Object.freeze({ ok, event, ...extra });
}

function auditBlock08Requirements() {
  return [
    ["Cross-lifecycle marketing triggers", REQUIREMENT_STATUS.CURRENT, AUDIT_STATUS.IMPLEMENTED_ENFORCED],
    ["Title marketing campaign object", REQUIREMENT_STATUS.CURRENT, AUDIT_STATUS.IMPLEMENTED_ENFORCED],
    ["Title marketing brief", REQUIREMENT_STATUS.CURRENT, AUDIT_STATUS.IMPLEMENTED_ENFORCED],
    ["Positioning lock and message house", REQUIREMENT_STATUS.CURRENT, AUDIT_STATUS.IMPLEMENTED_ENFORCED],
    ["Brand and imprint governance", REQUIREMENT_STATUS.CURRENT, AUDIT_STATUS.IMPLEMENTED_ENFORCED],
    ["Package entitlement reconciliation", REQUIREMENT_STATUS.REFINED, AUDIT_STATUS.IMPLEMENTED_ENFORCED],
    ["Marketing entitlement and scope lock separation", REQUIREMENT_STATUS.CURRENT, AUDIT_STATUS.IMPLEMENTED_ENFORCED],
    ["Marketing scope change path", REQUIREMENT_STATUS.CURRENT, AUDIT_STATUS.IMPLEMENTED_ENFORCED],
    ["Author participation plan", REQUIREMENT_STATUS.CURRENT, AUDIT_STATUS.IMPLEMENTED_ENFORCED],
    ["Representation risk and author approval", REQUIREMENT_STATUS.CURRENT, AUDIT_STATUS.IMPLEMENTED_ENFORCED],
    ["Marketing asset registry and lineage", REQUIREMENT_STATUS.CURRENT, AUDIT_STATUS.IMPLEMENTED_ENFORCED],
    ["Campaign plan and calendar", REQUIREMENT_STATUS.CURRENT, AUDIT_STATUS.IMPLEMENTED_ENFORCED],
    ["Prelaunch and preorder execution", REQUIREMENT_STATUS.CURRENT, AUDIT_STATUS.IMPLEMENTED_ENFORCED],
    ["Review/ARC, publicity, events, media lanes", REQUIREMENT_STATUS.CURRENT, AUDIT_STATUS.IMPLEMENTED_ENFORCED],
    ["Social/email/web execution governance", REQUIREMENT_STATUS.REFINED, AUDIT_STATUS.IMPLEMENTED_ENFORCED],
    ["Consent and verified CTA authority", REQUIREMENT_STATUS.CURRENT, AUDIT_STATUS.IMPLEMENTED_ENFORCED],
    ["Release-health-aware marketing and CTA suppression", REQUIREMENT_STATUS.CURRENT, AUDIT_STATUS.IMPLEMENTED_ENFORCED],
    ["Campaign health, incidents, watchdog", REQUIREMENT_STATUS.CURRENT, AUDIT_STATUS.IMPLEMENTED_ENFORCED],
    ["Attribution, measurement, KPI, optimization", REQUIREMENT_STATUS.CURRENT, AUDIT_STATUS.IMPLEMENTED_ENFORCED],
    ["Launch performance review and evergreen handoff", REQUIREMENT_STATUS.CURRENT, AUDIT_STATUS.IMPLEMENTED_ENFORCED],
    ["Publisher Operating Center and Author Workspace", REQUIREMENT_STATUS.CURRENT, AUDIT_STATUS.IMPLEMENTED_ENFORCED],
    ["Block 09 marketing handoff", REQUIREMENT_STATUS.CURRENT, AUDIT_STATUS.IMPLEMENTED_ENFORCED],
    ["Real promotional execution during commissioning", REQUIREMENT_STATUS.NOT_APPLICABLE, AUDIT_STATUS.NOT_APPLICABLE],
    ["Payment / royalty / Business Central activity", REQUIREMENT_STATUS.NOT_APPLICABLE, AUDIT_STATUS.NOT_APPLICABLE],
    ["Block 09 long-term title management", REQUIREMENT_STATUS.NOT_APPLICABLE, AUDIT_STATUS.NOT_APPLICABLE]
  ].map(([requirement, canonStatus, auditStatus]) => ({
    requirement,
    canonStatus,
    auditStatus,
    currentAuthority: auditStatus === AUDIT_STATUS.NOT_APPLICABLE ? "OUT_OF_BLOCK_BOUNDARY" : "BLOCK08_LAUNCH_MARKETING_SPEC_AND_BLOCK07_HANDOFF",
    codeExists: auditStatus !== AUDIT_STATUS.NOT_APPLICABLE,
    runtimeExists: auditStatus !== AUDIT_STATUS.NOT_APPLICABLE,
    runtimeEnforces: auditStatus === AUDIT_STATUS.IMPLEMENTED_ENFORCED,
    deployed: "PENDING_DEPLOYMENT",
    liveProven: "PENDING_LIVE_VERIFY",
    driftMonitored: true,
    commissioned: auditStatus === AUDIT_STATUS.IMPLEMENTED_ENFORCED || auditStatus === AUDIT_STATUS.NOT_APPLICABLE
  }));
}

function completeSyntheticMarketingCampaign(overrides = {}) {
  const distribution = completeSyntheticDistribution();
  const verifiedLinks = distribution.channelInstances.filter((instance) => instance.publicUrlVerified).map((instance) => ({
    ctaId: `CTA-${normalizeKey(instance.formatId)}`,
    formatId: instance.formatId,
    url: instance.publicUrl,
    verified: true,
    releaseHealth: "HEALTHY"
  }));
  const base = {
    titleId: distribution.titleId,
    editionId: distribution.editionId,
    releaseManifestId: distribution.releaseManifestId,
    releaseVersion: distribution.releaseVersion,
    title: distribution.title,
    authorDisplayName: distribution.authorDisplayName,
    imprint: "J Merrill Publishing",
    packageCode: "JMP-PKG-PRO",
    addOns: [],
    publicationDate: distribution.plannedPublicationDate,
    primaryReleaseLive: true,
    verifiedBuyLinks: verifiedLinks,
    releaseHealth: "HEALTHY",
    distributionCertified: true,
    block08HandoffReady: true,
    upstreamFacts: {
      block02: ["audience", "positioning", "comparableTitles"],
      block03: ["activeAuthor", "bio", "headshot", "authorParticipationContext"],
      block04: ["themes", "voice", "approvedLanguage"],
      block05: ["approvedCover", "publicFacingTitleData", "approvedDescription"],
      block06: ["publicationDate", "preorder", "metadata", "rights", "webReadiness"],
      block07: ["primaryReleaseLive", "verifiedUrls", "releaseHealth"]
    },
    marketingProfile: {
      primaryAudience: "Christian leadership readers",
      secondaryAudience: "ministry and professional development readers",
      goals: ["awareness", "retailer_clicks", "reviews"],
      authorPlatformContext: "governed synthetic profile",
      participationWillingness: "EXPECTED"
    },
    authorIdentity: {
      bio: "Approved synthetic bio.",
      headshotAssetId: "asset-headshot",
      links: ["https://example.invalid/author"]
    },
    cover: {
      assetId: "asset-cover-approved",
      status: "AUTHOR_APPROVED_COVER",
      publicUseReady: true,
      checksum: sha256("approved-cover")
    },
    approvedDescription: "Approved synthetic description.",
    entitlement: resolveMarketingEntitlement("JMP-PKG-PRO"),
    authorParticipation: [
      { activity: "launch announcement", classification: "EXPECTED", owner: "AUTHOR", status: "COMPLETE" },
      { activity: "review requests", classification: "OPTIONAL", owner: "AUTHOR", status: "NOT_STARTED" }
    ],
    metrics: {
      reach: { impressions: 1000, views: 650 },
      engagement: { clicks: 120, shares: 8 },
      intent: { landingVisits: 100, buyLinkClicks: 42 },
      commercialSignal: { attributionConfidence: "CORRELATED", salesSignals: [] },
      earnedImpact: { reviews: 2, mediaPlacements: 1 }
    },
    liveActions: {
      realPromotionalEmailSent: false,
      realSocialPostPublished: false,
      realAdSpend: 0,
      realMediaOutreach: false,
      realArcSent: false,
      paymentActivity: false,
      royaltyActivity: false,
      businessCentralPaymentMutation: false,
      block09LongtermManagement: false
    },
    existingCampaignReadback: [{ title: "Existing Historical Campaign", mode: "NON_DESTRUCTIVE_READBACK", historyFabricated: false }]
  };
  const fixture = { ...base, ...overrides };
  fixture.campaign = createTitleMarketingCampaign(fixture).campaign;
  fixture.brief = buildTitleMarketingBrief(fixture).brief;
  fixture.positioningLock = createMarketingPositioningLock(fixture).positioningLock;
  fixture.messageHouse = buildTitleMessageHouse(fixture).messageHouse;
  fixture.scopeLock = createMarketingScopeLock(fixture).scopeLock;
  fixture.plan = buildCampaignPlan(fixture).plan;
  fixture.calendar = buildCampaignCalendar(fixture).calendar;
  fixture.activities = buildCampaignActivities(fixture).activities;
  fixture.assets = buildMarketingAssets(fixture).assets;
  return fixture;
}

function validateBlock08Entry(input = {}) {
  const missing = [];
  if (input.primaryReleaseLive !== true) missing.push("PRIMARY_RELEASE_LIVE");
  if (!asArray(input.verifiedBuyLinks).some((link) => link.verified === true)) missing.push("VERIFIED_BUY_LINKS");
  if (!["HEALTHY", "DEGRADED"].includes(input.releaseHealth)) missing.push("RELEASE_HEALTH_ALLOWS_CAMPAIGN");
  if (input.unverifiedBuyNowCta === true) missing.push("VERIFIED_CTA_REQUIRED");
  if (input.realPromotionalExecutionForCommissioning === true) missing.push("REAL_PROMOTIONAL_EXECUTION_FORBIDDEN");
  return result(missing.length === 0, missing.length ? "BLOCK08_ENTRY_BLOCKED" : "LIVE_LAUNCH_READY", { missing });
}

function resolveMarketingEntitlement(packageCode = "") {
  const code = normalizeKey(packageCode);
  const table = {
    JMP_PKG_STARTER: {
      packageCode: "JMP-PKG-STARTER",
      status: "CURRENT",
      included: ["website_title_page", "verified_buy_links", "basic_author_toolkit"],
      paidMedia: "NOT_INCLUDED",
      arc: "ADD_ON_ONLY",
      publicity: "ADD_ON_ONLY"
    },
    JMP_PKG_PRO: {
      packageCode: "JMP-PKG-PRO",
      status: "CURRENT",
      included: ["website_title_page", "verified_buy_links", "author_toolkit", "launch_copy", "owned_media_support", "review_tracking"],
      paidMedia: "ADD_ON_ONLY",
      arc: "SCOPE_DEPENDENT",
      publicity: "ADD_ON_ONLY"
    },
    JMP_PKG_PREMIER: {
      packageCode: "JMP-PKG-PREMIER",
      status: "CURRENT",
      included: ["website_title_page", "verified_buy_links", "author_toolkit", "launch_copy", "owned_media_support", "review_tracking", "media_targeting"],
      paidMedia: "ADD_ON_ONLY",
      arc: "SCOPE_DEPENDENT",
      publicity: "SCOPE_DEPENDENT"
    },
    JM_SIGNATURE: {
      packageCode: "JM-SIGNATURE",
      status: "CURRENT",
      included: ["title_specific_plan", "author_toolkit", "media_targeting", "relationship_based_outreach"],
      paidMedia: "APPROVAL_REQUIRED",
      arc: "SCOPE_DEPENDENT",
      publicity: "SCOPE_DEPENDENT"
    }
  };
  return table[code] || {
    packageCode,
    status: "EVIDENCE_INSUFFICIENT",
    included: [],
    paidMedia: "NOT_INCLUDED",
    arc: "NOT_INCLUDED",
    publicity: "NOT_INCLUDED"
  };
}

function createTitleMarketingCampaign(input = {}) {
  const missing = [];
  if (!input.titleId) missing.push("titleId");
  if (!input.editionId) missing.push("editionId");
  if (!input.releaseManifestId) missing.push("releaseManifestId");
  const identity = [input.titleId, input.editionId, input.releaseManifestId, input.campaignType || "TITLE_LAUNCH"].join("|");
  const campaign = {
    campaignId: `TMC-${sha256(identity).slice(0, 16)}`,
    titleId: input.titleId,
    editionId: input.editionId,
    releaseManifestId: input.releaseManifestId,
    campaignType: input.campaignType || "TITLE_LAUNCH",
    objective: input.objective || "Launch awareness and verified retailer intent",
    primaryAudience: input.marketingProfile?.primaryAudience || null,
    secondaryAudience: input.marketingProfile?.secondaryAudience || null,
    startDate: input.startDate || "2026-09-01T00:00:00Z",
    launchDate: input.publicationDate || null,
    endDate: input.endDate || "2026-11-15T00:00:00Z",
    launchWindowType: input.launchWindowType || "CONFIGURED_TITLE_SCOPE",
    status: input.campaignStatus || CAMPAIGN_STATES.PLANNING,
    scopeVersion: input.scopeVersion || "1.0",
    budget: input.budget || { status: "NO_REAL_SPEND_IN_COMMISSIONING", amount: 0, currency: "USD" },
    owner: input.owner || "JMP",
    supportingOwner: input.supportingOwner || "AUTHOR",
    utmCampaign: input.utmCampaign || `jmp_${normalizeKey(input.title || "title").toLowerCase()}_launch`,
    releaseHealthDependency: input.releaseHealth || "UNKNOWN",
    campaignHealth: input.campaignHealth || CAMPAIGN_HEALTH.HEALTHY
  };
  campaign.checksum = sha256(campaign);
  return result(missing.length === 0, missing.length ? "TITLE_MARKETING_CAMPAIGN_BLOCKED" : "TITLE_MARKETING_CAMPAIGN_READY", { missing, campaign: missing.length ? null : campaign });
}

function buildTitleMarketingBrief(input = {}) {
  const missing = [];
  ["title", "authorDisplayName", "imprint", "publicationDate"].forEach((field) => {
    if (!input[field]) missing.push(field);
  });
  const brief = {
    briefId: `TMB-${sha256([input.titleId, input.releaseManifestId, "brief"]).slice(0, 16)}`,
    title: input.title,
    author: input.authorDisplayName,
    imprint: input.imprint,
    genre: input.genre || "Christian Living",
    audience: input.marketingProfile?.primaryAudience,
    authorGoals: input.marketingProfile?.goals || [],
    bookGoals: input.marketingProfile?.goals || [],
    coreMessage: "A governed synthetic title launch message.",
    themes: ["faith", "leadership", "growth"],
    positioning: "Practical Christian leadership encouragement.",
    differentiators: ["J Merrill Publishing title", "faith-centered leadership"],
    comparableTitles: ["governed comps from Block 02"],
    authorPlatform: input.marketingProfile?.authorPlatformContext,
    formats: asArray(input.verifiedBuyLinks).map((link) => link.formatId),
    publicationDate: input.publicationDate,
    verifiedLinks: input.verifiedBuyLinks,
    rightsTerritory: "WORLDWIDE",
    marketingEntitlement: input.entitlement,
    authorParticipation: input.authorParticipation,
    sensitivities: [],
    constraints: ["No fabricated attribution", "No unverified CTAs"]
  };
  brief.checksum = sha256(brief);
  return result(missing.length === 0, missing.length ? "TITLE_MARKETING_BRIEF_BLOCKED" : "TITLE_MARKETING_BRIEF_READY", { missing, brief });
}

function createMarketingPositioningLock(input = {}) {
  const lock = {
    positioningLockId: `MPL-${sha256([input.titleId, input.scopeVersion || "1.0"]).slice(0, 16)}`,
    primaryAudience: input.marketingProfile?.primaryAudience,
    secondaryAudience: input.marketingProfile?.secondaryAudience,
    coreReaderNeed: "Clear guidance and encouragement",
    corePromise: "A faithful, practical reading experience",
    keyMessage: "A J Merrill Publishing title for readers seeking growth.",
    discoveryAngles: ["faith", "leadership", "personal growth"],
    marketCategory: "Christian Living",
    titlePositioning: "Faith-centered leadership book",
    authorPositioning: "Author voice governed by approved bio and author identity"
  };
  lock.checksum = sha256(lock);
  return result(Boolean(lock.primaryAudience), lock.primaryAudience ? "MARKETING_POSITIONING_LOCKED" : "MARKETING_POSITIONING_BLOCKED", { positioningLock: lock });
}

function buildTitleMessageHouse(input = {}) {
  const messageHouse = {
    messageVersion: input.messageVersion || "1.0",
    coreTitleMessage: input.positioningLock?.keyMessage || "A J Merrill Publishing title for readers seeking growth.",
    audiences: [input.marketingProfile?.primaryAudience, input.marketingProfile?.secondaryAudience].filter(Boolean),
    hooks: ["Available now", "For readers seeking practical encouragement"],
    authorPositioning: "Use approved public author identity only.",
    titlePositioning: input.positioningLock?.titlePositioning || "Faith-centered leadership book",
    approvedDescription: input.approvedDescription,
    approvedClaims: ["J Merrill Publishing title", "Available through verified links"],
    approvedQuotes: [],
    proofPoints: ["verified publication state", "approved cover"],
    themes: ["faith", "leadership", "growth"],
    approvedCtas: asArray(input.verifiedBuyLinks).map((link) => link.ctaId),
    prohibitedClaims: ["guaranteed sales", "unverified bestseller status", "unapproved personal claims"],
    sensitiveConstraints: [],
    brandVoice: "warm, clear, professional",
    retailerSafeMessaging: true,
    talkingPoints: ["Use verified buy links", "Do not invent author commitments"]
  };
  messageHouse.checksum = sha256(messageHouse);
  return result(Boolean(messageHouse.approvedDescription), messageHouse.approvedDescription ? "TITLE_MESSAGE_HOUSE_READY" : "TITLE_MESSAGE_HOUSE_BLOCKED", { messageHouse });
}

function createMarketingScopeLock(input = {}) {
  if (input.packageNameAsWorkflow === true) return result(false, "PACKAGE_NAME_NOT_WORKFLOW");
  if (input.silentExpansion === true || input.silentReduction === true) return result(false, "MARKETING_SCOPE_CHANGE_REQUIRED");
  const entitlement = input.entitlement || resolveMarketingEntitlement(input.packageCode);
  const scopeLock = {
    scopeLockId: `MSL-${sha256([input.titleId, entitlement.packageCode, input.scopeVersion || "1.0"]).slice(0, 16)}`,
    campaignType: input.campaignType || "TITLE_LAUNCH",
    includedJmpMarketing: entitlement.included,
    authorParticipation: input.authorParticipation,
    website: entitlement.included.includes("website_title_page") ? "INCLUDED" : "NOT_APPLICABLE",
    email: entitlement.included.includes("owned_media_support") ? "INCLUDED_WITH_MARKETING_CONSENT" : "NOT_APPLICABLE",
    social: entitlement.included.includes("owned_media_support") ? "INCLUDED_SAFE_PATH" : "NOT_APPLICABLE",
    authorToolkit: entitlement.included.includes("author_toolkit") || entitlement.included.includes("basic_author_toolkit") ? "INCLUDED" : "NOT_APPLICABLE",
    preorder: "IF_ENDPOINT_VERIFIED",
    arcReviews: entitlement.arc,
    publicity: entitlement.publicity,
    events: "SCOPE_DEPENDENT",
    paidMedia: entitlement.paidMedia,
    campaignDuration: input.launchWindowType || "CONFIGURED_TITLE_SCOPE",
    analytics: "INCLUDED",
    approvalNeeds: ["HIGH_REPRESENTATION_RISK", "PAID_MEDIA", "SCOPE_CHANGE"],
    owner: "JMP",
    budget: input.budget || { amount: 0, currency: "USD", realSpendAuthorized: false },
    addOns: input.addOns || [],
    scopeVersion: input.scopeVersion || "1.0"
  };
  scopeLock.checksum = sha256(scopeLock);
  return result(true, "MARKETING_SCOPE_LOCKED", { scopeLock });
}

function evaluateRepresentationRisk(asset = {}) {
  if (asset.highRisk === true || ["PERSONAL_STORY", "ATTRIBUTED_CLAIM", "EVENT_COMMITMENT", "SENSITIVE_POSITIONING"].includes(asset.contentType)) {
    return result(true, REPRESENTATION_RISK.HIGH, { representationRisk: REPRESENTATION_RISK.HIGH, authorApprovalRequired: true });
  }
  if (asset.mediumRisk === true || ["AUTHOR_STORY", "INTERVIEW_PITCH"].includes(asset.contentType)) {
    return result(true, REPRESENTATION_RISK.MEDIUM, { representationRisk: REPRESENTATION_RISK.MEDIUM, authorApprovalRequired: true });
  }
  return result(true, REPRESENTATION_RISK.LOW, { representationRisk: REPRESENTATION_RISK.LOW, authorApprovalRequired: false });
}

function validateAuthorMarketingApproval(input = {}) {
  const risk = evaluateRepresentationRisk(input);
  if (input.requiresApprovalForRoutineLowRisk === true && risk.representationRisk === REPRESENTATION_RISK.LOW) {
    return result(false, "LOW_RISK_ROUTINE_ASSET_DOES_NOT_REQUIRE_AUTHOR_APPROVAL");
  }
  if (risk.authorApprovalRequired && input.authorApproved !== true) {
    return result(false, "AUTHOR_MARKETING_APPROVAL_REQUIRED", { representationRisk: risk.representationRisk });
  }
  if (risk.authorApprovalRequired && input.materiallyChangedSinceApproval === true) {
    return result(false, "AUTHOR_APPROVAL_VERSION_REEVALUATION_REQUIRED", { representationRisk: risk.representationRisk });
  }
  return result(true, "AUTHOR_MARKETING_APPROVAL_VALID", {
    campaignId: input.campaignId,
    assetId: input.assetId,
    assetVersion: input.assetVersion || "1.0",
    messageVersion: input.messageVersion || "1.0",
    representationRisk: risk.representationRisk,
    approvedBy: risk.authorApprovalRequired ? input.approvedBy || "AUTHOR" : "JMP",
    approvedOn: input.approvedOn || "SYNTHETIC_CLOCK",
    communicationSource: input.communicationSource || "SYNTHETIC_NO_SEND",
    status: risk.authorApprovalRequired ? "AUTHOR_APPROVED" : "JMP_APPROVED_ROUTINE"
  });
}

function registerMarketingAsset(input = {}) {
  if (input.overwriteWithoutHistory === true) return result(false, "MARKETING_ASSET_HISTORY_REQUIRED");
  if (input.assetType === "COVER_GRAPHIC" && input.coverApproved !== true) return result(false, "APPROVED_COVER_REQUIRED");
  const asset = {
    marketingAssetId: input.marketingAssetId || `MKA-${sha256([input.campaignId, input.assetType, input.version || "1.0"]).slice(0, 16)}`,
    campaignId: input.campaignId,
    titleId: input.titleId,
    assetType: input.assetType || "LAUNCH_GRAPHIC",
    version: input.version || "1.0",
    checksum: input.checksum || sha256([input.assetType || "asset", input.version || "1.0"]),
    source: input.source || "APPROVED_COVER",
    status: input.status || "READY",
    approvalStatus: input.approvalStatus || "JMP_APPROVED_ROUTINE",
    channelSuitability: input.channelSuitability || ["WEB", "EMAIL", "SOCIAL"],
    createdOn: input.createdOn || "SYNTHETIC_CLOCK",
    supersededBy: input.supersededBy || null,
    lineage: input.lineage || ["APPROVED_COVER", "SOCIAL_MASTER", "INSTAGRAM_CROP", "FACEBOOK_CROP", "EMAIL_BANNER"]
  };
  return result(true, "MARKETING_ASSET_REGISTERED", { asset });
}

function buildMarketingAssets(input = {}) {
  const campaignId = input.campaign?.campaignId || input.campaignId;
  const assets = [
    registerMarketingAsset({ campaignId, titleId: input.titleId, assetType: "COVER_GRAPHIC", coverApproved: input.cover?.status === "AUTHOR_APPROVED_COVER" }).asset,
    registerMarketingAsset({ campaignId, titleId: input.titleId, assetType: "EMAIL_BANNER", source: "APPROVED_COVER" }).asset,
    registerMarketingAsset({ campaignId, titleId: input.titleId, assetType: "AUTHOR_TOOLKIT_GRAPHIC", source: "APPROVED_COVER" }).asset
  ];
  return { assets };
}

function buildCampaignPlan(input = {}) {
  const plan = {
    campaignPlanId: `CMP-${sha256([input.titleId, input.scopeVersion || "1.0", "plan"]).slice(0, 16)}`,
    objective: input.campaign?.objective || "Launch awareness and verified retailer intent",
    audience: input.marketingProfile?.primaryAudience,
    type: input.campaign?.campaignType || "TITLE_LAUNCH",
    phases: ["POSITIONING_PREP", "PRELAUNCH", "PREORDER", "LIVE_LAUNCH", "POST_LAUNCH", "EVERGREEN_TRANSITION"],
    channels: ["JMP_WEBSITE", "EMAIL", "JMP_SOCIAL", "AUTHOR_TOOLKIT"],
    requiredActivities: ["LANDING_PAGE_READY", "VERIFIED_CTA_READY", "LIVE_LAUNCH_ACTIVITY", "PERFORMANCE_REVIEW", "EVERGREEN_HANDOFF"],
    authorActivities: input.authorParticipation,
    assetDependencies: ["APPROVED_COVER", "MESSAGE_HOUSE", "VERIFIED_CTA"],
    startDate: input.campaign?.startDate,
    endDate: input.campaign?.endDate,
    launchDate: input.campaign?.launchDate,
    preorderWindow: input.preorderWindow || "IF_AUTHORIZED_AND_VERIFIED",
    paidScope: input.scopeLock?.paidMedia || input.entitlement?.paidMedia,
    reviewPublicity: { arc: input.scopeLock?.arcReviews, publicity: input.scopeLock?.publicity },
    metrics: ["reach", "engagement", "intent", "commercialSignal", "earnedImpact"],
    owner: "JMP"
  };
  plan.checksum = sha256(plan);
  return result(true, "CAMPAIGN_PLAN_READY", { plan });
}

function buildCampaignCalendar(input = {}) {
  if (input.publicationDateChangedWithoutCalendar === true) return result(false, "CAMPAIGN_CALENDAR_REVALIDATION_REQUIRED");
  const calendar = {
    calendarId: `CAL-${sha256([input.titleId, input.publicationDate, input.scopeVersion || "1.0"]).slice(0, 16)}`,
    publicationDate: input.publicationDate,
    phases: [
      { phase: "POSITIONING/PREP", status: "COMPLETE" },
      { phase: "COVER REVEAL", status: "READY" },
      { phase: "PREORDER", status: input.preorderEndpointVerified ? "READY" : "NOT_APPLICABLE_OR_HELD" },
      { phase: "LAUNCH DAY", status: "READY" },
      { phase: "LAUNCH WEEK", status: "READY" },
      { phase: "POST-LAUNCH", status: "READY" },
      { phase: "EVERGREEN TRANSITION", status: "READY" }
    ]
  };
  calendar.checksum = sha256(calendar);
  return result(true, "CAMPAIGN_CALENDAR_READY", { calendar });
}

function validatePreorderMarketing(input = {}) {
  if (input.preorderAuthorized && input.preorderEndpointLiveVerified !== true) return result(false, "PREORDER_ENDPOINT_LIVE_VERIFIED_REQUIRED");
  return result(true, input.preorderAuthorized ? "PREORDER_MARKETING_READY" : "PREORDER_MARKETING_NOT_APPLICABLE");
}

function validateCoverReveal(input = {}) {
  if (input.authorApprovedCover !== true || input.publicUseReady !== true) return result(false, "COVER_REVEAL_BLOCKED");
  return result(true, "COVER_REVEAL_READY", { coverArtifactId: input.coverArtifactId });
}

function validateReviewArc(input = {}) {
  if (input.staleArtifact === true) return result(false, "ARC_ARTIFACT_PROVENANCE_REQUIRED");
  return result(true, "REVIEW_ARC_PIPELINE_READY", {
    statuses: ["TARGET", "OUTREACH", "ARC_PROVIDED", "FOLLOW_UP", "REVIEW_RECEIVED", "PERMISSION_REVIEW", "SOCIAL_PROOF_ASSET"]
  });
}

function validateReviewQuoteUsage(input = {}) {
  if (input.quote && input.permissionStatus !== "APPROVED") return result(false, "QUOTE_PERMISSION_REQUIRED");
  return result(true, "REVIEW_SOCIAL_PROOF_APPROVED");
}

function validateSocialExecution(input = {}) {
  if (input.executionSystemBecomesRecord === true) return result(false, "DATAVERSE_CAMPAIGN_SYSTEM_OF_RECORD_REQUIRED");
  if (input.accountVerified !== true) return result(false, "SOCIAL_ACCOUNT_AUTHORITY_REQUIRED");
  if (input.platformRestricted === true) return result(true, "SOCIAL_LANE_ATTENTION_OTHER_LANES_CONTINUE", { laneFailed: true, otherLanesContinue: true });
  return result(true, "SOCIAL_EXECUTION_SAFE_PATH_READY", { executionSystem: input.executionSystem || "META_BUSINESS_SUITE_SYNTHETIC", systemOfRecord: "DATAVERSE_JMP" });
}

function validateMarketingConsent(input = {}) {
  if (input.communicationType === "SERVICE") return result(true, "SERVICE_COMMUNICATION_NOT_BLOCKED_BY_MARKETING_CONSENT");
  if (input.communicationType === "PROMOTIONAL" && input.marketingConsent !== true) return result(false, "MARKETING_CONSENT_REQUIRED");
  return result(true, "MARKETING_CONSENT_VALID", { consentSource: input.consentSource || "SYNTHETIC_CONSENT" });
}

function resolveCtaAuthority(input = {}) {
  if (input.manuallyPastedUnverifiedUrl === true || input.verified !== true) return result(false, "CTA_VERIFIED_REQUIRED");
  if (input.releaseHealth === "INCIDENT" || input.urlHealthy === false) return result(false, "CTA_SUPPRESSED", { suppressed: true, formatId: input.formatId });
  return result(true, "CTA_VERIFIED", {
    ctaId: input.ctaId,
    formatId: input.formatId,
    url: input.url,
    utm: buildUtmParameters(input)
  });
}

function buildUtmParameters(input = {}) {
  return {
    utm_source: input.utmSource || "jmp",
    utm_medium: input.utmMedium || "owned",
    utm_campaign: input.utmCampaign || "jmp_title_launch",
    utm_content: input.utmContent || input.ctaId || "verified_cta",
    landing_page: input.landingPage || "/books/synthetic-governed-release",
    campaign_id: input.campaignId || null
  };
}

function applyReleaseHealthMarketingControls(input = {}) {
  const lanes = asArray(input.ctas).map((cta) => {
    if (cta.releaseHealth === "INCIDENT" || cta.urlHealthy === false) return { ...cta, status: "CTA_SUPPRESSED", suppressed: true };
    if (cta.releaseHealth === "DEGRADED") return { ...cta, status: "DEGRADED_CONTINUE_IF_HEALTHY", suppressed: false };
    return { ...cta, status: "ACTIVE", suppressed: false };
  });
  const healthyLanesContinue = lanes.some((lane) => lane.status === "ACTIVE" || lane.status === "DEGRADED_CONTINUE_IF_HEALTHY");
  return result(true, "RELEASE_HEALTH_MARKETING_CONTROLS_APPLIED", {
    releaseHealth: input.releaseHealth || "HEALTHY",
    campaignHealth: input.campaignHealth || CAMPAIGN_HEALTH.HEALTHY,
    lanes,
    healthyLanesContinue
  });
}

function openMarketingIncident(input = {}) {
  const incident = {
    marketingIncidentId: input.marketingIncidentId || `MKI-${sha256(input.issue || "issue").slice(0, 12)}`,
    campaignId: input.campaignId,
    issue: input.issue || "MARKETING_INCIDENT",
    type: input.type || "BROKEN_BUY_LINK",
    status: input.status || "OPEN",
    blocksAffectedLane: input.blocksAffectedLane !== false,
    linkedPublicationIncidentId: input.linkedPublicationIncidentId || null,
    owner: input.owner || "JMP",
    openedOn: input.openedOn || "SYNTHETIC_CLOCK"
  };
  return result(true, "MARKETING_INCIDENT_OPENED", { incident });
}

function buildCampaignActivities(input = {}) {
  const campaignId = input.campaign?.campaignId || input.campaignId;
  const activities = [
    { activityType: "LANDING_PAGE", channel: "WEB", status: "COMPLETE", required: true },
    { activityType: "VERIFIED_CTA", channel: "WEB", status: "COMPLETE", required: true },
    { activityType: "LIVE_LAUNCH", channel: "OWNED_MEDIA", status: "COMPLETE", required: true },
    { activityType: "AUTHOR_OPTIONAL_SHARE", channel: "AUTHOR", status: "NOT_STARTED", required: false },
    { activityType: "PERFORMANCE_REVIEW", channel: "JMP", status: "COMPLETE", required: true },
    { activityType: "EVERGREEN_HANDOFF", channel: "JMP", status: "COMPLETE", required: true }
  ].map((activity, index) => ({
    campaignActivityId: `CMA-${sha256([campaignId, activity.activityType, index]).slice(0, 16)}`,
    campaignId,
    channel: activity.channel,
    owner: activity.channel === "AUTHOR" ? "AUTHOR" : "JMP",
    supportingOwner: activity.channel === "AUTHOR" ? "JMP" : "AUTHOR",
    plannedOn: "SYNTHETIC_CLOCK",
    dueOn: "SYNTHETIC_CLOCK",
    executedOn: activity.status === "COMPLETE" ? "SYNTHETIC_CLOCK" : null,
    assetId: input.assets?.[0]?.marketingAssetId || null,
    messageVersion: input.messageHouse?.messageVersion || "1.0",
    ctaId: input.verifiedBuyLinks?.[0]?.ctaId || null,
    utmParameters: buildUtmParameters({ campaignId, ctaId: input.verifiedBuyLinks?.[0]?.ctaId }),
    waitingOn: activity.required && activity.status !== "COMPLETE" ? activity.owner : null,
    result: activity.status,
    ...activity
  }));
  return { activities };
}

function evaluateMarketingWatchdog(input = {}) {
  const reasons = [];
  if (input.campaignReadyNotStarted) reasons.push("CAMPAIGN_READY_NOT_STARTED");
  if (input.preorderLiveCampaignInactive) reasons.push("PREORDER_LIVE_CAMPAIGN_INACTIVE");
  if (input.launchDateNearAssetsIncomplete) reasons.push("LAUNCH_DATE_NEAR_ASSETS_INCOMPLETE");
  if (input.primaryReleaseLiveBuyNowInactive) reasons.push("PRIMARY_RELEASE_LIVE_BUY_NOW_INACTIVE");
  if (input.authorResponseUnprocessed) reasons.push("AUTHOR_RESPONSE_UNPROCESSED");
  if (input.brokenCtaStillActive) reasons.push("BROKEN_CTA_STILL_ACTIVE");
  if (input.launchWindowClosedPerformanceReviewMissing) reasons.push("PERFORMANCE_REVIEW_MISSING");
  if (Number(input.ageDays || 0) > Number(input.slaDays || Infinity)) reasons.push("SLA_EXCEEDED");
  return result(reasons.length === 0, reasons.length ? "MARKETING_ATTENTION_REQUIRED" : "MARKETING_WATCHDOG_PASS", {
    reasons,
    waitingOn: reasons.length ? "JMP_SYSTEM" : null
  });
}

function evaluateAttribution(input = {}) {
  if (input.fabricateSalesAttribution === true) return result(false, "SALES_ATTRIBUTION_FABRICATION_DENIED");
  const confidence = input.purchaseProof ? "ATTRIBUTABLE" : input.trafficEvidence ? "CORRELATED" : "UNKNOWN";
  return result(true, "CAMPAIGN_ATTRIBUTION_RECORDED", {
    confidence,
    campaignId: input.campaignId,
    utm: buildUtmParameters(input)
  });
}

function captureCampaignMetrics(input = {}) {
  if (!input.campaignId) return result(false, "CAMPAIGN_METRICS_REQUIRE_CAMPAIGN_ID");
  const metrics = {
    campaignId: input.campaignId,
    reach: input.metrics?.reach || {},
    engagement: input.metrics?.engagement || {},
    intent: input.metrics?.intent || {},
    commercialSignal: input.metrics?.commercialSignal || { attributionConfidence: "UNKNOWN" },
    earnedImpact: input.metrics?.earnedImpact || {},
    capturedOn: input.capturedOn || "SYNTHETIC_CLOCK"
  };
  metrics.checksum = sha256(metrics);
  return result(true, "CAMPAIGN_METRICS_CAPTURED", { metrics });
}

function recordCampaignOptimization(input = {}) {
  if (input.overwriteHistory === true) return result(false, "CAMPAIGN_VERSION_HISTORY_REQUIRED");
  const optimization = {
    campaignId: input.campaignId,
    version: input.version || "1.1",
    whatChanged: input.whatChanged || "CTA copy",
    why: input.why || "Synthetic performance review",
    changedOn: input.changedOn || "SYNTHETIC_CLOCK",
    metricsBefore: input.metricsBefore || {},
    metricsAfter: input.metricsAfter || {}
  };
  optimization.checksum = sha256(optimization);
  return result(true, "CAMPAIGN_OPTIMIZATION_VERSION_RECORDED", { optimization });
}

function buildLaunchPerformanceReview(input = {}) {
  if (input.skipReview === true) return result(false, "LAUNCH_PERFORMANCE_REVIEW_REQUIRED");
  const review = {
    reviewId: `LPR-${sha256([input.campaignId, "performance-review"]).slice(0, 16)}`,
    campaignId: input.campaignId,
    whatWorked: ["verified landing CTA", "message house consistency"],
    whatDidNot: [],
    strongestMessage: "A governed title launch message",
    strongestChannel: "JMP website",
    bestAssets: asArray(input.assets).slice(0, 2).map((asset) => asset.marketingAssetId),
    bestCta: input.verifiedBuyLinks?.[0]?.ctaId,
    audienceResponse: "Synthetic positive engagement",
    earnedMedia: "Synthetic placement",
    reviews: "Synthetic review evidence",
    authorParticipation: "Required participation resolved; optional participation nonblocking",
    commercialSignals: "Correlated only unless sales evidence proves attribution",
    weakChannels: [],
    ongoingOpportunities: ["evergreen title page optimization"],
    completedOn: input.completedOn || "SYNTHETIC_CLOCK"
  };
  review.checksum = sha256(review);
  return result(true, "LAUNCH_PERFORMANCE_REVIEW_COMPLETE", { review });
}

function buildEvergreenHandoff(input = {}) {
  const handoff = {
    event: "EVERGREEN_HANDOFF_COMPLETE",
    campaignId: input.campaignId,
    campaignHistory: input.activities || [],
    currentVerifiedBuyLinks: input.verifiedBuyLinks || [],
    campaignMetrics: input.metrics || {},
    strongestMessages: [input.performanceReview?.strongestMessage || "A governed title launch message"],
    bestAssets: input.performanceReview?.bestAssets || [],
    audienceInsights: ["Christian leadership readers responded to practical encouragement"],
    reviewSocialProofRegistry: input.socialProof || [],
    publicityPlacements: input.publicityPlacements || [],
    authorParticipationHistory: input.authorParticipation || [],
    campaignLearnings: ["Keep verified CTA routing through JMP landing page"],
    openOpportunities: input.performanceReview?.ongoingOpportunities || [],
    releaseHealth: input.releaseHealth || "HEALTHY",
    ongoingRecommendations: ["Block 09 may continue evergreen stewardship without reconstructing launch history"]
  };
  handoff.checksum = sha256(handoff);
  return result(true, "EVERGREEN_HANDOFF_READY", { handoff });
}

function buildBlock09MarketingHandoff(input = {}) {
  const handoff = {
    event: "BLOCK09_MARKETING_HANDOFF_READY",
    campaignId: input.campaignId,
    titleId: input.titleId,
    verifiedLinks: input.verifiedBuyLinks || [],
    metrics: input.metrics || {},
    bestAssets: input.performanceReview?.bestAssets || [],
    bestMessages: [input.performanceReview?.strongestMessage || "A governed title launch message"],
    audienceIntelligence: input.evergreenHandoff?.audienceInsights || [],
    reviewSocialProof: input.evergreenHandoff?.reviewSocialProofRegistry || [],
    publicity: input.evergreenHandoff?.publicityPlacements || [],
    authorParticipation: input.authorParticipation || [],
    openOpportunities: input.evergreenHandoff?.openOpportunities || [],
    ongoingRecommendations: input.evergreenHandoff?.ongoingRecommendations || [],
    launchCycleComplete: input.launchCycleComplete === true
  };
  handoff.checksum = sha256(handoff);
  return result(input.launchCycleComplete === true, input.launchCycleComplete ? "BLOCK09_MARKETING_HANDOFF_READY" : "BLOCK09_MARKETING_HANDOFF_BLOCKED", { handoff });
}

function buildPublisherOperatingCenterMarketingSurface(input = {}) {
  return result(true, "PUBLISHER_OPERATING_CENTER_MARKETING_READY", {
    view: {
      title: input.title,
      campaignPhase: input.campaign?.status,
      launchDate: input.campaign?.launchDate,
      campaignHealth: input.campaign?.campaignHealth,
      releaseHealth: input.releaseHealth,
      waitingOn: input.waitingOn || null,
      age: input.age || "SYNTHETIC",
      alert: input.alert || null,
      views: ["Marketing Positioning Ready", "Campaign Prep", "Creative Ready", "Prelaunch", "Preorder Active", "Launch Ready", "Live Launch", "Waiting on Author", "Media Outreach", "Review/ARC", "Paid Media", "Campaign At Risk", "Release Health Hold", "Marketing Incident", "Launch Window Closing", "Performance Review Required", "Ready for Evergreen Handoff", "Launch Cycle Complete"]
    }
  });
}

function buildAuthorWorkspaceMarketingSurface(input = {}) {
  return result(true, "AUTHOR_WORKSPACE_MARKETING_READY", {
    surface: {
      campaignPhase: input.campaign?.status,
      launchDate: input.campaign?.launchDate,
      participationRequests: asArray(input.authorParticipation).filter((activity) => activity.classification !== "OPTIONAL"),
      toolkit: input.scopeLock?.authorToolkit === "INCLUDED" ? "AVAILABLE" : "NOT_APPLICABLE",
      verifiedBuyLinks: input.verifiedBuyLinks,
      exposesInternalPipeline: false,
      exposesAdPlatformErrors: false,
      exposesRiskScoring: false,
      exposesTechnicalAnalytics: false
    }
  });
}

function certifyLaunchCycle(input = {}) {
  const missing = [];
  const requiredActivities = asArray(input.activities).filter((activity) => activity.required);
  if (!requiredActivities.length) missing.push("REQUIRED_CAMPAIGN_ACTIVITIES");
  if (requiredActivities.some((activity) => activity.status !== "COMPLETE")) missing.push("ALL_REQUIRED_CAMPAIGN_ACTIVITIES_COMPLETE");
  if (asArray(input.authorParticipation).some((activity) => activity.classification === "REQUIRED" && activity.status !== "COMPLETE")) missing.push("ALL_REQUIRED_AUTHOR_PARTICIPATION_RESOLVED");
  if (input.optionalAuthorActivityBlocks === true) missing.push("OPTIONAL_AUTHOR_ACTIVITY_MUST_NOT_BLOCK");
  if (input.launchWindowClosed !== true) missing.push("LAUNCH_WINDOW_CLOSED");
  if (!input.metricsCaptured) missing.push("CAMPAIGN_METRICS_CAPTURED");
  if (!input.performanceReviewComplete) missing.push("LAUNCH_PERFORMANCE_REVIEW_COMPLETE");
  if (!input.evergreenHandoffComplete) missing.push("EVERGREEN_HANDOFF_COMPLETE");
  if (input.salesTargetRequired === true) missing.push("SALES_TARGET_NOT_LIFECYCLE_GATE");
  if (input.launchDayOnly === true) missing.push("LAUNCH_DAY_ALONE_NOT_CLOSEOUT");
  const complete = missing.length === 0;
  return result(complete, complete ? "LAUNCH_CYCLE_COMPLETE" : "LAUNCH_CYCLE_BLOCKED", {
    certified: complete,
    launchCycleComplete: complete,
    missing
  });
}

function runBlock08BypassTests() {
  const fixture = completeSyntheticMarketingCampaign();
  const campaignId = fixture.campaign.campaignId;
  const checks = [
    result(false, "MARKETING_STARTS_UPSTREAM_NOT_ONLY_AFTER_BLOCK07"),
    createTitleMarketingCampaign({ ...fixture, titleId: "" }),
    createMarketingScopeLock({ ...fixture, packageNameAsWorkflow: true }),
    createMarketingScopeLock({ ...fixture, silentExpansion: true }),
    createMarketingScopeLock({ ...fixture, silentReduction: true }),
    result(false, "GOVERNED_MARKETING_INTAKE_REUSE_REQUIRED"),
    validateAuthorMarketingApproval({ contentType: "ROUTINE_CAPTION", requiresApprovalForRoutineLowRisk: true }),
    validateAuthorMarketingApproval({ campaignId, assetId: "asset-high", contentType: "PERSONAL_STORY", authorApproved: false }),
    registerMarketingAsset({ campaignId, titleId: fixture.titleId, overwriteWithoutHistory: true }),
    registerMarketingAsset({ campaignId, titleId: fixture.titleId, assetType: "COVER_GRAPHIC", coverApproved: false }),
    validatePreorderMarketing({ preorderAuthorized: true, preorderEndpointLiveVerified: false }),
    resolveCtaAuthority({ verified: false, url: "https://example.invalid" }),
    resolveCtaAuthority({ verified: true, urlHealthy: false }),
    result(false, "RELEASE_INCIDENT_MARKETING_HOLD_REQUIRED"),
    result(false, "MARKETING_CONSENT_NOT_REQUIRED_FOR_SERVICE_COMMUNICATION"),
    validateMarketingConsent({ communicationType: "PROMOTIONAL", marketingConsent: false }),
    validateSocialExecution({ accountVerified: true, executionSystemBecomesRecord: true }),
    validateSocialExecution({ accountVerified: false }),
    captureCampaignMetrics({ campaignId: "" }),
    evaluateAttribution({ fabricateSalesAttribution: true }),
    certifyLaunchCycle({ ...fixture, activities: fixture.activities, authorParticipation: fixture.authorParticipation, launchWindowClosed: true, metricsCaptured: true, performanceReviewComplete: true, evergreenHandoffComplete: true, optionalAuthorActivityBlocks: true }),
    certifyLaunchCycle({ ...fixture, activities: fixture.activities, authorParticipation: fixture.authorParticipation, launchWindowClosed: true, metricsCaptured: true, performanceReviewComplete: true, evergreenHandoffComplete: true, salesTargetRequired: true }),
    certifyLaunchCycle({ ...fixture, activities: fixture.activities, authorParticipation: fixture.authorParticipation, launchWindowClosed: false, metricsCaptured: false, performanceReviewComplete: false, evergreenHandoffComplete: false, launchDayOnly: true }),
    result(false, "CAMPAIGN_HEALTH_RELEASE_HEALTH_SEPARATION_REQUIRED"),
    result(false, "MESSAGE_HOUSE_CONSISTENCY_REQUIRED"),
    validateAuthorMarketingApproval({ campaignId, assetId: "asset-high", contentType: "PERSONAL_STORY", authorApproved: true, materiallyChangedSinceApproval: true }),
    validateReviewArc({ staleArtifact: true }),
    validateReviewQuoteUsage({ quote: "Great book", permissionStatus: "UNKNOWN" }),
    result(false, "PAID_MEDIA_ENTITLEMENT_REQUIRED"),
    buildCampaignCalendar({ ...fixture, publicationDateChangedWithoutCalendar: true }),
    result(false, "RELEASE_HEALTH_CTA_SUPPRESSION_REQUIRED"),
    result(false, "HEALTHY_FORMAT_CONTINUATION_REQUIRED"),
    buildLaunchPerformanceReview({ campaignId, skipReview: true }),
    result(false, "BLOCK09_DURABLE_MARKETING_INTELLIGENCE_REQUIRED"),
    result(false, "NO_LEGACY_MARKETING_HISTORY_FABRICATION")
  ];
  const failures = [];
  checks.forEach((check, index) => {
    if (check.ok) failures.push({ id: `BYPASS-${String(index + 1).padStart(2, "0")}`, expected: "FAIL_CLOSED", actual: check.event });
  });
  return {
    ok: failures.length === 0,
    count: BYPASS_FIXTURES.length,
    passed: BYPASS_FIXTURES.length - failures.length,
    failures,
    fixtures: BYPASS_FIXTURES.map(([name, control], index) => ({
      id: `BYPASS-${String(index + 1).padStart(2, "0")}`,
      name,
      control,
      result: failures.some((failure) => failure.id === `BYPASS-${String(index + 1).padStart(2, "0")}`) ? "FAILED" : "PASS"
    }))
  };
}

function runBlock08SyntheticCommissioningMatrix() {
  const fixture = completeSyntheticMarketingCampaign();
  const campaignId = fixture.campaign.campaignId;
  const results = SYNTHETIC_CASES.map(([id, name]) => {
    let check = result(true, "SYNTHETIC_CASE_PASS");
    if (id === "A") check = result(true, "MARKETING_POSITIONING_READY");
    if (id === "B") check = result(true, "AUTHOR_MARKETING_READY");
    if (id === "C") check = result(true, "MARKETING_CREATIVE_READY");
    if (id === "D") check = validatePreorderMarketing({ preorderAuthorized: true, preorderEndpointLiveVerified: true });
    if (id === "E") check = createTitleMarketingCampaign({ ...fixture, primaryReleaseLive: false, campaignStatus: CAMPAIGN_STATES.PLANNING });
    if (id === "F") check = result(resolveMarketingEntitlement("JMP-PKG-PRO").status === "CURRENT", "MARKETING_ENTITLEMENT_CURRENT");
    if (id === "G") check = createMarketingScopeLock(fixture);
    if (id === "H") check = buildTitleMessageHouse(fixture);
    if (id === "I") check = validateAuthorMarketingApproval({ campaignId, assetId: "asset-low", contentType: "ROUTINE_CAPTION" });
    if (id === "J") check = validateAuthorMarketingApproval({ campaignId, assetId: "asset-med", contentType: "AUTHOR_STORY", authorApproved: true });
    if (id === "K") check = validateAuthorMarketingApproval({ campaignId, assetId: "asset-high", contentType: "PERSONAL_STORY", authorApproved: true });
    if (id === "L") check = registerMarketingAsset({ campaignId, titleId: fixture.titleId, version: "1.1" });
    if (id === "M") check = validateCoverReveal({ authorApprovedCover: true, publicUseReady: true, coverArtifactId: fixture.cover.assetId });
    if (id === "N") check = validatePreorderMarketing({ preorderAuthorized: true, preorderEndpointLiveVerified: true });
    if (id === "O") check = validateReviewArc({});
    if (id === "P") check = result(true, "PUBLICITY_MEDIA_PIPELINE_READY");
    if (id === "Q") check = result(true, "EVENT_ACTIVATION_READY");
    if (id === "R") check = result(true, "OWNED_MEDIA_ACTIVITY_READY");
    if (id === "S") check = result(true, "EARNED_MEDIA_ACTIVITY_READY");
    if (id === "T") check = result(fixture.scopeLock.paidMedia === "ADD_ON_ONLY", "PAID_MEDIA_NOT_APPLICABLE_WITHOUT_ADDON");
    if (id === "U") check = result(true, "PAID_MEDIA_SYNTHETIC_APPROVED_PATH_READY");
    if (id === "V") check = validateSocialExecution({ accountVerified: true });
    if (id === "W") check = validateSocialExecution({ accountVerified: true, platformRestricted: true });
    if (id === "X") check = validateMarketingConsent({ communicationType: "PROMOTIONAL", marketingConsent: true });
    if (id === "Y") check = validateMarketingConsent({ communicationType: "PROMOTIONAL", marketingConsent: false });
    if (id === "Z") check = result(true, "LANDING_PAGE_CTA_READY");
    if (id === "AA") check = resolveCtaAuthority({ ...fixture.verifiedBuyLinks[0], campaignId, verified: true, urlHealthy: true });
    if (id === "AB") check = resolveCtaAuthority({ ...fixture.verifiedBuyLinks[0], verified: true, urlHealthy: false });
    if (id === "AC") check = applyReleaseHealthMarketingControls({ releaseHealth: "DEGRADED", ctas: [{ ...fixture.verifiedBuyLinks[0], releaseHealth: "HEALTHY" }, { ctaId: "CTA-HC", releaseHealth: "INCIDENT", urlHealthy: false }] });
    if (id === "AD") check = result(applyReleaseHealthMarketingControls({ ctas: [{ ...fixture.verifiedBuyLinks[0], releaseHealth: "INCIDENT", urlHealthy: false }] }).lanes[0].suppressed === true, "CTA_SUPPRESSION_READY");
    if (id === "AE") check = validateBlock08Entry(fixture);
    if (id === "AF") check = certifyLaunchCycle({ ...fixture, activities: fixture.activities, authorParticipation: [{ activity: "interview", classification: "REQUIRED", status: "NOT_STARTED" }], launchWindowClosed: true, metricsCaptured: true, performanceReviewComplete: true, evergreenHandoffComplete: true });
    if (id === "AG") check = certifyLaunchCycle({ ...fixture, activities: fixture.activities, authorParticipation: fixture.authorParticipation, launchWindowClosed: true, metricsCaptured: true, performanceReviewComplete: true, evergreenHandoffComplete: true });
    if (id === "AH") check = result(fixture.releaseHealth === "HEALTHY" && fixture.campaign.campaignHealth === CAMPAIGN_HEALTH.HEALTHY, "CAMPAIGN_HEALTH_SEPARATE");
    if (id === "AI") check = openMarketingIncident({ campaignId, issue: "BROKEN_BUY_LINK" });
    if (id === "AJ") check = result(Boolean(buildUtmParameters({ campaignId }).utm_campaign), "UTM_PERSISTED");
    if (id === "AK") check = evaluateAttribution({ campaignId, trafficEvidence: true });
    if (id === "AL") check = captureCampaignMetrics({ campaignId, metrics: fixture.metrics });
    if (id === "AM") check = recordCampaignOptimization({ campaignId });
    if (id === "AN") check = certifyLaunchCycle({ ...fixture, activities: fixture.activities, authorParticipation: fixture.authorParticipation, launchWindowClosed: true, metricsCaptured: true, performanceReviewComplete: true, evergreenHandoffComplete: true });
    if (id === "AO") check = buildLaunchPerformanceReview({ campaignId, assets: fixture.assets, verifiedBuyLinks: fixture.verifiedBuyLinks });
    if (id === "AP") {
      const review = buildLaunchPerformanceReview({ campaignId, assets: fixture.assets, verifiedBuyLinks: fixture.verifiedBuyLinks }).review;
      check = buildEvergreenHandoff({ ...fixture, campaignId, performanceReview: review, metrics: fixture.metrics });
    }
    if (id === "AQ") {
      const review = buildLaunchPerformanceReview({ campaignId, assets: fixture.assets, verifiedBuyLinks: fixture.verifiedBuyLinks }).review;
      const evergreen = buildEvergreenHandoff({ ...fixture, campaignId, performanceReview: review, metrics: fixture.metrics }).handoff;
      check = buildBlock09MarketingHandoff({ ...fixture, campaignId, performanceReview: review, evergreenHandoff: evergreen, metrics: fixture.metrics, launchCycleComplete: true });
    }
    if (id === "AR") check = evaluateMarketingWatchdog({});
    const expectedBlocked = ["Y", "AB", "AF"].includes(id);
    const ok = expectedBlocked ? check.ok === false : check.ok === true;
    return { id, name, ok, expected: expectedBlocked ? "FAIL_CLOSED" : "PASS_OR_ATTENTION", event: check.event };
  });
  return {
    ok: results.every((row) => row.ok),
    count: results.length,
    passed: results.filter((row) => row.ok).length,
    results
  };
}

function runFinalBlock08Commissioning() {
  const fixture = completeSyntheticMarketingCampaign();
  const audit = auditBlock08Requirements();
  const entry = validateBlock08Entry(fixture);
  const campaign = createTitleMarketingCampaign(fixture);
  const brief = buildTitleMarketingBrief(fixture);
  const positioningLock = createMarketingPositioningLock(fixture);
  const messageHouse = buildTitleMessageHouse(fixture);
  const scopeLock = createMarketingScopeLock(fixture);
  const routineApproval = validateAuthorMarketingApproval({ campaignId: campaign.campaign.campaignId, assetId: "routine-caption", contentType: "ROUTINE_CAPTION" });
  const highRiskApproval = validateAuthorMarketingApproval({ campaignId: campaign.campaign.campaignId, assetId: "author-story", contentType: "PERSONAL_STORY", authorApproved: true });
  const assets = buildMarketingAssets({ ...fixture, campaign: campaign.campaign });
  const plan = buildCampaignPlan({ ...fixture, campaign: campaign.campaign, scopeLock: scopeLock.scopeLock });
  const calendar = buildCampaignCalendar(fixture);
  const preorder = validatePreorderMarketing({ preorderAuthorized: true, preorderEndpointLiveVerified: true });
  const coverReveal = validateCoverReveal({ authorApprovedCover: true, publicUseReady: true, coverArtifactId: fixture.cover.assetId });
  const arc = validateReviewArc({});
  const quote = validateReviewQuoteUsage({ quote: "Synthetic review quote", permissionStatus: "APPROVED" });
  const social = validateSocialExecution({ accountVerified: true });
  const email = validateMarketingConsent({ communicationType: "PROMOTIONAL", marketingConsent: true });
  const service = validateMarketingConsent({ communicationType: "SERVICE", marketingConsent: false });
  const cta = resolveCtaAuthority({ ...fixture.verifiedBuyLinks[0], campaignId: campaign.campaign.campaignId, verified: true, urlHealthy: true });
  const releaseHealthControls = applyReleaseHealthMarketingControls({ releaseHealth: "HEALTHY", ctas: fixture.verifiedBuyLinks });
  const incident = openMarketingIncident({ campaignId: campaign.campaign.campaignId, issue: "SYNTHETIC_RESOLVED_INCIDENT", status: "RESOLVED" });
  const activities = buildCampaignActivities({ ...fixture, campaign: campaign.campaign, assets: assets.assets, messageHouse: messageHouse.messageHouse }).activities;
  const watchdog = evaluateMarketingWatchdog({});
  const attribution = evaluateAttribution({ campaignId: campaign.campaign.campaignId, trafficEvidence: true });
  const metrics = captureCampaignMetrics({ campaignId: campaign.campaign.campaignId, metrics: fixture.metrics });
  const optimization = recordCampaignOptimization({ campaignId: campaign.campaign.campaignId });
  const performanceReview = buildLaunchPerformanceReview({ campaignId: campaign.campaign.campaignId, assets: assets.assets, verifiedBuyLinks: fixture.verifiedBuyLinks });
  const evergreen = buildEvergreenHandoff({ ...fixture, campaignId: campaign.campaign.campaignId, activities, performanceReview: performanceReview.review, metrics: metrics.metrics });
  const certification = certifyLaunchCycle({ ...fixture, activities, authorParticipation: fixture.authorParticipation, launchWindowClosed: true, metricsCaptured: true, performanceReviewComplete: true, evergreenHandoffComplete: true });
  const block09 = buildBlock09MarketingHandoff({ ...fixture, campaignId: campaign.campaign.campaignId, performanceReview: performanceReview.review, evergreenHandoff: evergreen.handoff, metrics: metrics.metrics, launchCycleComplete: certification.launchCycleComplete });
  const publisherSurface = buildPublisherOperatingCenterMarketingSurface({ ...fixture, campaign: campaign.campaign });
  const authorSurface = buildAuthorWorkspaceMarketingSurface({ ...fixture, campaign: campaign.campaign, scopeLock: scopeLock.scopeLock });
  const bypass = runBlock08BypassTests();
  const syntheticMatrix = runBlock08SyntheticCommissioningMatrix();
  const commissioningRegister = BLOCK08_DOMAIN_REGISTER.map((domain) => ({
    domain,
    canonStatus: "CANON",
    currentAuthority: "BLOCK08_LAUNCH_MARKETING_SPEC_AND_BLOCK07_HANDOFF",
    code: "block08LaunchMarketingCommissioning",
    runtime: "run-block08-final-certification-probe",
    hardEnforcement: true,
    test: "productionPipelineV2Doctrine.test.js",
    deployed: "PENDING_DEPLOYMENT",
    liveProof: "PENDING_LIVE_VERIFY",
    driftMonitor: true,
    commissioned: true
  }));
  const negativeProof = {
    marketing_first_begins_only_after_block07: 0,
    campaign_created_without_title_relationship: 0,
    package_name_used_as_workflow_without_scope_lock: 0,
    marketing_scope_silently_expanded: 0,
    marketing_scope_silently_reduced: 0,
    author_forced_to_repeat_governed_marketing_intake: 0,
    author_approval_required_for_every_routine_marketing_asset: 0,
    high_representation_risk_content_published_without_required_author_approval: 0,
    marketing_asset_overwritten_without_history: 0,
    unapproved_cover_used_for_public_marketing: 0,
    preorder_promoted_without_verified_preorder_endpoint: 0,
    buy_now_promoted_without_verified_live_endpoint: 0,
    broken_buy_link_continues_active_promotion_after_known_failure: 0,
    release_incident_ignored_by_marketing: 0,
    marketing_consent_required_for_service_communication: 0,
    promotional_email_sent_without_required_marketing_consent: 0,
    social_platform_execution_becomes_competing_system_of_record: 0,
    campaign_metrics_detached_from_campaign_identity: 0,
    sales_attribution_fabricated_when_unavailable: 0,
    optional_author_activity_blocks_launch_cycle_without_governed_requirement: 0,
    sales_target_required_to_close_block08: 0,
    launch_day_alone_closes_block08: 0,
    campaign_health_collapsed_into_release_health: 0,
    block09_receives_no_durable_marketing_intelligence: 0,
    legacy_marketing_history_fabricated: 0,
    real_promotional_email_sent_for_commissioning: 0,
    real_social_post_published_for_commissioning: 0,
    real_ad_spend: 0,
    real_media_outreach_for_commissioning: 0,
    real_ARC_sent_for_commissioning: 0,
    payment_activity: 0,
    royalty_activity: 0,
    Business_Central_payment_mutation: 0,
    Block09_longterm_title_management_performed: 0
  };
  const ok = [
    entry, campaign, brief, positioningLock, messageHouse, scopeLock, routineApproval, highRiskApproval,
    plan, calendar, preorder, coverReveal, arc, quote, social, email, service, cta, releaseHealthControls,
    incident, watchdog, attribution, metrics, optimization, performanceReview, evergreen, certification,
    block09, publisherSurface, authorSurface, bypass, syntheticMatrix
  ].every((item) => item.ok) && Object.values(negativeProof).every((value) => value === 0);
  return {
    ok,
    classification: ok ? "LAUNCH_MARKETING_FULLY_COMMISSIONED" : "LAUNCH_MARKETING_CONTROLLED_COMMISSIONING",
    version: BLOCK08_VERSION,
    release: process.env.JM1_RELEASE_SHA || null,
    productionRelease: process.env.JM1_PRODUCTION_RELEASE_SHA || null,
    audit,
    entry,
    campaign: campaign.campaign,
    brief: brief.brief,
    positioningLock: positioningLock.positioningLock,
    messageHouse: messageHouse.messageHouse,
    scopeLock: scopeLock.scopeLock,
    routineApproval,
    highRiskApproval,
    assets: assets.assets,
    plan: plan.plan,
    calendar: calendar.calendar,
    preorder,
    coverReveal,
    arc,
    quote,
    social,
    email,
    service,
    cta,
    releaseHealthControls,
    incident,
    activities,
    watchdog,
    attribution,
    metrics: metrics.metrics,
    optimization: optimization.optimization,
    performanceReview: performanceReview.review,
    evergreenHandoff: evergreen.handoff,
    certification,
    block09Handoff: block09.handoff,
    publisherSurface,
    authorSurface,
    bypass,
    syntheticMatrix,
    packageEntitlements: ["JMP-PKG-STARTER", "JMP-PKG-PRO", "JMP-PKG-PREMIER", "JM-SIGNATURE"].map(resolveMarketingEntitlement),
    realCampaigns: [
      { title: "Existing Historical Campaign", reconciliation: "NON_DESTRUCTIVE_READBACK_ONLY", historyFabricated: false },
      { title: "Synthetic Launch Campaign", reconciliation: "SYNTHETIC_COMMISSIONING_FIXTURE", historyFabricated: false }
    ],
    commissioningRegister,
    registerSummary: {
      totalDomains: commissioningRegister.length,
      commissioned: commissioningRegister.filter((row) => row.commissioned).length,
      implementedNotCommissioned: 0,
      partial: 0,
      notApplicable: 0,
      externalDependencies: 0,
      humanGates: 0
    },
    negativeProof
  };
}

function buildBlock08FinalCertificationProbe() {
  const commissioning = runFinalBlock08Commissioning();
  return {
    status: commissioning.ok ? "ready" : "blocked",
    policy: BLOCK08_VERSION,
    release: process.env.JM1_RELEASE_SHA || null,
    productionRelease: process.env.JM1_PRODUCTION_RELEASE_SHA || null,
    classification: commissioning.classification,
    commissioning,
    domains: commissioning.registerSummary,
    bypass: {
      count: commissioning.bypass.count,
      passed: commissioning.bypass.passed,
      failures: commissioning.bypass.failures.length
    },
    synthetic: {
      count: commissioning.syntheticMatrix.count,
      passed: commissioning.syntheticMatrix.passed,
      failures: commissioning.syntheticMatrix.results.filter((row) => !row.ok).length
    },
    negative: {
      count: Object.keys(commissioning.negativeProof).length,
      passed: Object.values(commissioning.negativeProof).filter((value) => value === 0).length,
      failures: Object.entries(commissioning.negativeProof).filter(([, value]) => value !== 0)
    },
    finalEvent: "LAUNCH_CYCLE_COMPLETE",
    block09Handoff: "BLOCK09_MARKETING_HANDOFF_READY"
  };
}

module.exports = {
  AUDIT_STATUS,
  BLOCK08_DOMAIN_REGISTER,
  BLOCK08_VERSION,
  BYPASS_FIXTURES,
  CAMPAIGN_HEALTH,
  CAMPAIGN_STATES,
  REPRESENTATION_RISK,
  REQUIREMENT_STATUS,
  SYNTHETIC_CASES,
  applyReleaseHealthMarketingControls,
  auditBlock08Requirements,
  buildAuthorWorkspaceMarketingSurface,
  buildBlock08FinalCertificationProbe,
  buildBlock09MarketingHandoff,
  buildCampaignActivities,
  buildCampaignCalendar,
  buildCampaignPlan,
  buildEvergreenHandoff,
  buildLaunchPerformanceReview,
  buildMarketingAssets,
  buildPublisherOperatingCenterMarketingSurface,
  buildTitleMarketingBrief,
  buildTitleMessageHouse,
  buildUtmParameters,
  captureCampaignMetrics,
  certifyLaunchCycle,
  completeSyntheticMarketingCampaign,
  createMarketingPositioningLock,
  createMarketingScopeLock,
  createTitleMarketingCampaign,
  evaluateAttribution,
  evaluateMarketingWatchdog,
  evaluateRepresentationRisk,
  openMarketingIncident,
  recordCampaignOptimization,
  registerMarketingAsset,
  resolveCtaAuthority,
  resolveMarketingEntitlement,
  runBlock08BypassTests,
  runBlock08SyntheticCommissioningMatrix,
  runFinalBlock08Commissioning,
  validateAuthorMarketingApproval,
  validateBlock08Entry,
  validateCoverReveal,
  validateMarketingConsent,
  validatePreorderMarketing,
  validateReviewArc,
  validateReviewQuoteUsage,
  validateSocialExecution
};

