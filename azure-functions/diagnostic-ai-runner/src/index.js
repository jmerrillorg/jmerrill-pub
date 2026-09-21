"use strict";

require("./functions/health");
require("./functions/getPublisherRecommendationReview");
require("./functions/runAgreementDocumentPreparation");
require("./functions/runAgreementPackageSend");
require("./functions/runGovernedAgreementGeneration");
require("./functions/runApprovalEventConsumer");
require("./functions/runAuthorReviewResponseConsumer");
require("./functions/runEditorialExecutionRuntime");
require("./functions/runBlock04CommissioningProbe");
require("./functions/runBlock05FinalCertificationProbe");
require("./functions/runBlock06FinalCertificationProbe");
require("./functions/runBlock07FinalCertificationProbe");
require("./functions/runBlock08FinalCertificationProbe");
require("./functions/runBlock09FinalCertificationProbe");
require("./functions/runWholeLifecycleClosureProbe");
require("./functions/runEditorialPackageHandoffConsumer");
require("./functions/runEditorialCadenceReleaseConsumer");
require("./functions/runEditorialNextStageMaterialization");
require("./functions/runDevelopmentalEntryMaterialization");
require("./functions/runAttaTitleDecisionSend");
require("./functions/runSharePointArtifactReconciliation");
require("./functions/runTargetedEditorialExecution");
require("./functions/runTargetedEditorialExecutionWorker");
require("./functions/runEditorialReviewNow");
require("./functions/runFullWrapExecutor");
require("./functions/runIntentionalLeaderAuthorResponse");
require("./functions/runMilestone6ContinuationCommunication");
require("./functions/runMilestone6EvidenceRecoveryLog");
require("./functions/runMilestone6OpportunityUpdate");
require("./functions/runMilestone6PaymentOptionCapture");
require("./functions/runManualSignatureHandoff");
require("./functions/runOp000TrackAAdoption");
require("./functions/runOp000TrackBAdoption");
require("./functions/runPackageSelectionCommercialContinuation");
require("./functions/runPaymentOptionCommercialContinuation");
require("./functions/runPaymentElectionCommunicationConsumer");
require("./functions/runPreContractEditorialReview");
require("./functions/runPublisherRecommendationAction");
require("./functions/runPublisherReviewDecision");
require("./functions/runPublishingIntakeAutostartRecovery");
require("./functions/runPublishingInboundDeltaReconciliation");
require("./functions/runPublishingInboundNotification");
require("./functions/runPublishingInboundReadback");
require("./functions/runPublishingInboundAssetPlacement");
require("./functions/runIyorwueseMapContinuity");
require("./functions/runPublishingInboundSubscriptionManager");
require("./functions/runPublishingMailboxReplyCheck");
require("./functions/runPublishingMailboxAttachmentReadback");
require("./functions/runEnterpriseMailboxReadbackHealth");
require("./functions/runCommercialEligibilityA2");
require("./functions/runStripeConnectReminderMonitor");
if ((process.env.JM1_ENVIRONMENT || "").trim().toUpperCase() === "UAT") {
  require("./functions/runPhase6OnboardingCertification");
}
if (
  (process.env.JM1_ENVIRONMENT || "").trim().toUpperCase() === "PRODUCTION" &&
  (process.env.JMP_PHASE6_PRODUCTION_CERTIFICATION_ROUTE_ENABLED || "").trim().toLowerCase() === "true"
) {
  require("./functions/runPhase6ProductionCertification");
}
require("./functions/runStage0Diagnostic");
require("./functions/signNowWebhook");
