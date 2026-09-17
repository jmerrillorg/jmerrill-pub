using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;
using System;
using System.Linq;
using System.Security.Cryptography;
using System.Text;

namespace Jmp.Publishing.V2.Phase6
{
    public sealed class Phase6OnboardingAuthorityPlugin : IPlugin
    {
        private const string Actor = "phase6-authorized-actor";
        private const string Authority = "V2_ONBOARDING_AUTHORITY";
        private const string EnabledEnvironmentVariable = "jmpv2_Phase6OnboardingCommandEnabled";

        public void Execute(IServiceProvider provider)
        {
            var context = (IPluginExecutionContext)provider.GetService(typeof(IPluginExecutionContext));
            var factory = (IOrganizationServiceFactory)provider.GetService(typeof(IOrganizationServiceFactory));
            var service = factory.CreateOrganizationService(context.UserId);
            var c = Read(context);
            if (!EnvironmentEnabled(service)) { Output(context, false, "PHASE6_ENVIRONMENT_NOT_ENABLED", false, false); return; }
            if (c.Actor != Actor || c.AuthorityContext != Authority) { Output(context, false, "UNAUTHORIZED_ONBOARDING_COMMAND", false, false); return; }
            try
            {
                switch (c.Operation)
                {
                    case "ACTIVATE": Activate(service, context, c); break;
                    case "SET_ITEM": SetItem(service, context, c); break;
                    case "SET_WORKSPACE": SetWorkspace(service, context, c); break;
                    case "SET_ACCESS": SetAccess(service, context, c); break;
                    case "SET_PAYOUT": SetPayout(service, context, c); break;
                    case "EVALUATE": Evaluate(service, context, c, true); break;
                    case "ELIGIBILITY": Evaluate(service, context, c, false); break;
                    default: Output(context, false, "UNKNOWN_COMMAND", false, false); break;
                }
            }
            catch (InvalidPluginExecutionException) { throw; }
            catch (Exception ex) { throw new InvalidPluginExecutionException("PHASE6_ATOMIC_COMMAND_FAILED: " + ex.Message, ex); }
        }

        private static void Activate(IOrganizationService s, IPluginExecutionContext x, Command c)
        {
            if (!Guid.TryParse(c.EngagementId, out var engagementId)) { Output(x, false, "UNKNOWN_ENGAGEMENT", false, false); return; }
            var engagement = TryRetrieve(s, "jmpv2_publishingengagement", engagementId, "jmpv2_lifecycleinstanceid");
            if (engagement == null && c.IdempotencyKey.StartsWith("PHASE6-SYNTHETIC-ACTIVATE-", StringComparison.Ordinal))
            {
                engagement = new Entity("jmpv2_publishingengagement", engagementId);
                engagement["jmpv2_engagementkey"] = "phase6-engagement-" + engagementId;
                engagement["jmpv2_canonicaltitleid"] = c.TitleId;
                engagement["jmpv2_canonicalauthorid"] = c.CanonicalContactId;
                engagement["jmpv2_canonicaltitlename"] = "Phase 6 Synthetic Title";
                engagement["jmpv2_canonicalauthorname"] = c.AuthorName;
                engagement["jmpv2_originsystem"] = "PHASE6_SYNTHETIC_TEST_ONLY";
                engagement["jmpv2_currentstage"] = "06_ONBOARDING";
                engagement["jmpv2_testclassification"] = c.TestClassification;
                s.Create(engagement);
            }
            if (engagement == null) { Output(x, false, "UNKNOWN_ENGAGEMENT", false, false); return; }
            if (!Guid.TryParse(c.LifecycleId, out var lifecycleId)) { Output(x, false, "UNKNOWN_LIFECYCLE", false, false); return; }
            var lifecycle = TryRetrieve(s, "jmpv2_lifecycleinstance", lifecycleId, "jmpv2_currentstagecode");
            if (lifecycle == null || lifecycle.GetAttributeValue<string>("jmpv2_currentstagecode") != "06_ONBOARDING") { Output(x, false, "ENGAGEMENT_NOT_AT_STAGE_06", false, false); return; }
            if (string.IsNullOrWhiteSpace(c.CanonicalContactId)) { Output(x, false, "UNKNOWN_AUTHOR", false, false); return; }

            var profile = One(s, "jmpv2_authorprofile", "jmpv2_canonicalcontactid", c.CanonicalContactId, "jmpv2_authorprofilekey");
            bool replay = false;
            if (profile == null)
            {
                profile = new Entity("jmpv2_authorprofile");
                profile["jmpv2_authorprofilekey"] = "profile-" + Guid.NewGuid();
                profile["jmpv2_canonicalcontactid"] = c.CanonicalContactId;
                profile["jmpv2_fullname"] = c.AuthorName;
                profile["jmpv2_email"] = c.Email;
                profile["jmpv2_activationstatus"] = "ACTIVE";
                profile["jmpv2_activationevent"] = c.IdempotencyKey;
                profile["jmpv2_correlationid"] = c.CorrelationId;
                profile["jmpv2_testclassification"] = c.TestClassification;
                profile["jmpv2_activatedat"] = DateTime.UtcNow;
                profile.Id = s.Create(profile);
            }

            var onboarding = One(s, "jmpv2_onboardingrecord", "jmpv2_engagementid", c.EngagementId, "jmpv2_onboardingkey", "jmpv2_authorprofilekey", "jmpv2_recordversion");
            if (onboarding != null) replay = true;
            else
            {
                onboarding = new Entity("jmpv2_onboardingrecord");
                onboarding["jmpv2_onboardingkey"] = "onboarding-" + Guid.NewGuid();
                onboarding["jmpv2_authorprofilekey"] = profile.GetAttributeValue<string>("jmpv2_authorprofilekey");
                onboarding["jmpv2_authorprofileid"] = profile.ToEntityReference();
                onboarding["jmpv2_canonicalcontactid"] = c.CanonicalContactId;
                onboarding["jmpv2_engagementid"] = c.EngagementId;
                onboarding["jmpv2_titleid"] = c.TitleId;
                onboarding["jmpv2_lifecycleid"] = c.LifecycleId;
                onboarding["jmpv2_completenessstatus"] = "INCOMPLETE";
                onboarding["jmpv2_completenessreasons"] = "REQUIRED_ITEMS_PENDING";
                onboarding["jmpv2_policyversion"] = string.IsNullOrWhiteSpace(c.PolicyVersion) ? "1" : c.PolicyVersion;
                onboarding["jmpv2_recordversion"] = 1;
                onboarding["jmpv2_correlationid"] = c.CorrelationId;
                onboarding["jmpv2_testclassification"] = c.TestClassification;
                onboarding["jmpv2_startedat"] = DateTime.UtcNow;
                onboarding.Id = s.Create(onboarding);
            }
            x.OutputParameters["AuthorProfileKey"] = profile.GetAttributeValue<string>("jmpv2_authorprofilekey");
            x.OutputParameters["OnboardingKey"] = onboarding.GetAttributeValue<string>("jmpv2_onboardingkey");
            x.OutputParameters["RecordVersion"] = onboarding.GetAttributeValue<int?>("jmpv2_recordversion") ?? 1;
            Output(x, true, replay ? "ONBOARDING_REPLAY" : "ONBOARDING_ACTIVATED", replay, false);
        }

        private static void SetItem(IOrganizationService s, IPluginExecutionContext x, Command c)
        {
            var o = RequireOnboarding(s, x, c); if (o == null) return;
            if (!CheckVersion(x, c, o)) return;
            if (string.IsNullOrWhiteSpace(c.ItemType) || (c.Classification != "REQUIRED" && c.Classification != "OPTIONAL")) { Output(x, false, "INVALID_ITEM_CONTRACT", false, false); return; }
            if (c.ItemStatus != "PENDING" && c.ItemStatus != "COMPLETE") { Output(x, false, "INVALID_ITEM_STATUS", false, false); return; }
            if (c.ItemStatus == "COMPLETE" && string.IsNullOrWhiteSpace(c.EvidenceReference)) { Output(x, false, "ITEM_EVIDENCE_REQUIRED", false, false); return; }
            if (!string.IsNullOrWhiteSpace(c.EvidenceEngagementId) && c.EvidenceEngagementId != o.GetAttributeValue<string>("jmpv2_engagementid")) { Output(x, false, "CROSS_ENGAGEMENT_EVIDENCE", false, false); return; }
            var key = o.GetAttributeValue<string>("jmpv2_onboardingkey") + ":" + c.ItemType;
            var item = One(s, "jmpv2_onboardingitem", "jmpv2_itemkey", key, "jmpv2_status", "jmpv2_itemversion");
            bool replay = item != null && item.GetAttributeValue<string>("jmpv2_status") == c.ItemStatus;
            if (!replay)
            {
                var target = item == null ? new Entity("jmpv2_onboardingitem") : new Entity("jmpv2_onboardingitem", item.Id);
                target["jmpv2_itemkey"] = key; target["jmpv2_onboardingkey"] = o.GetAttributeValue<string>("jmpv2_onboardingkey");
                target["jmpv2_onboardingrecordid"] = o.ToEntityReference();
                target["jmpv2_itemtype"] = c.ItemType; target["jmpv2_classification"] = c.Classification; target["jmpv2_status"] = c.ItemStatus;
                target["jmpv2_evidencereference"] = c.EvidenceReference; target["jmpv2_evidencechecksum"] = c.EvidenceChecksum;
                target["jmpv2_evidenceengagementid"] = o.GetAttributeValue<string>("jmpv2_engagementid");
                target["jmpv2_itemversion"] = (item?.GetAttributeValue<int?>("jmpv2_itemversion") ?? 0) + 1;
                target["jmpv2_testclassification"] = c.TestClassification;
                if (c.ItemStatus == "COMPLETE") target["jmpv2_completedat"] = DateTime.UtcNow;
                if (item == null) s.Create(target); else s.Update(target);
                Bump(s, o);
            }
            Output(x, true, replay ? "ITEM_REPLAY" : (item != null && c.ItemStatus == "PENDING" ? "ITEM_REOPENED" : "ITEM_RECORDED"), replay, false);
        }

        private static void SetWorkspace(IOrganizationService s, IPluginExecutionContext x, Command c)
        {
            var o = RequireOnboarding(s, x, c); if (o == null) return; if (!CheckVersion(x, c, o)) return;
            if (c.WorkspacePath != "/01_Pipeline_A-Z" && !c.WorkspacePath.StartsWith("/01_Pipeline_A-Z/", StringComparison.Ordinal)) { Output(x, false, "INVALID_CANONICAL_PIPELINE_ROOT", false, false); return; }
            if (c.WorkspaceStatus != "ALREADY_EXISTS" && c.WorkspaceStatus != "PROVISION_REQUIRED" && c.WorkspaceStatus != "PROVISIONED") { Output(x, false, "INVALID_WORKSPACE_STATUS", false, false); return; }
            var prior = One(s, "jmpv2_workspaceprovisioning", "jmpv2_engagementid", c.EngagementId, "jmpv2_status", "jmpv2_idempotencykey");
            if (prior != null && prior.GetAttributeValue<string>("jmpv2_idempotencykey") == c.IdempotencyKey) { Output(x, true, "WORKSPACE_REPLAY", true, false); return; }
            if (prior != null && prior.GetAttributeValue<string>("jmpv2_status") == "PROVISIONED" && c.WorkspaceStatus == "PROVISION_REQUIRED") { Output(x, false, "DUPLICATE_WORKSPACE", false, false); return; }
            var e = prior == null ? new Entity("jmpv2_workspaceprovisioning") : new Entity("jmpv2_workspaceprovisioning", prior.Id);
            e["jmpv2_workspacekey"] = "workspace:" + c.EngagementId; e["jmpv2_onboardingkey"] = o.GetAttributeValue<string>("jmpv2_onboardingkey");
            e["jmpv2_onboardingrecordid"] = o.ToEntityReference();
            e["jmpv2_authorprofilekey"] = o.GetAttributeValue<string>("jmpv2_authorprofilekey"); e["jmpv2_engagementid"] = c.EngagementId; e["jmpv2_titleid"] = o.GetAttributeValue<string>("jmpv2_titleid");
            e["jmpv2_canonicalroot"] = "/01_Pipeline_A-Z"; e["jmpv2_workspacepath"] = c.WorkspacePath; e["jmpv2_workspaceitemid"] = c.WorkspaceItemId;
            e["jmpv2_status"] = c.WorkspaceStatus; e["jmpv2_idempotencykey"] = c.IdempotencyKey; e["jmpv2_testclassification"] = c.TestClassification;
            if (c.WorkspaceStatus == "PROVISIONED" || c.WorkspaceStatus == "ALREADY_EXISTS") e["jmpv2_provisionedat"] = DateTime.UtcNow;
            if (prior == null) s.Create(e); else s.Update(e); Bump(s, o); Output(x, true, "WORKSPACE_RECORDED", false, false);
        }

        private static void SetAccess(IOrganizationService s, IPluginExecutionContext x, Command c)
        {
            var o = RequireOnboarding(s, x, c); if (o == null) return; if (!CheckVersion(x, c, o)) return;
            if (c.AccessStatus == "READY" && string.IsNullOrWhiteSpace(c.EvidenceReference)) { Output(x, false, "ACCESS_EVIDENCE_REQUIRED", false, false); return; }
            var prior = One(s, "jmpv2_authoraccess", "jmpv2_engagementid", c.EngagementId, "jmpv2_idempotencykey", "jmpv2_status");
            if (prior != null && prior.GetAttributeValue<string>("jmpv2_idempotencykey") == c.IdempotencyKey) { Output(x, true, "ACCESS_REPLAY", true, false); return; }
            var e = prior == null ? new Entity("jmpv2_authoraccess") : new Entity("jmpv2_authoraccess", prior.Id);
            e["jmpv2_accesskey"] = "access:" + c.EngagementId; e["jmpv2_onboardingkey"] = o.GetAttributeValue<string>("jmpv2_onboardingkey"); e["jmpv2_authorprofilekey"] = o.GetAttributeValue<string>("jmpv2_authorprofilekey");
            e["jmpv2_onboardingrecordid"] = o.ToEntityReference();
            e["jmpv2_engagementid"] = c.EngagementId; e["jmpv2_status"] = c.AccessStatus; e["jmpv2_evidencereference"] = c.EvidenceReference; e["jmpv2_evidencechecksum"] = c.EvidenceChecksum;
            e["jmpv2_idempotencykey"] = c.IdempotencyKey; e["jmpv2_testclassification"] = c.TestClassification;
            if (c.AccessStatus == "READY") e["jmpv2_verifiedat"] = DateTime.UtcNow;
            if (prior == null) s.Create(e); else s.Update(e); Bump(s, o); Output(x, true, "ACCESS_RECORDED", false, false);
        }

        private static void SetPayout(IOrganizationService s, IPluginExecutionContext x, Command c)
        {
            var o = RequireOnboarding(s, x, c); if (o == null) return; if (!CheckVersion(x, c, o)) return;
            bool required = c.PayoutRequired == "YES";
            if (required && c.PayoutStatus == "READY" && string.IsNullOrWhiteSpace(c.EvidenceReference)) { Output(x, false, "PAYOUT_EVIDENCE_REQUIRED", false, false); return; }
            var prior = One(s, "jmpv2_payoutreadiness", "jmpv2_engagementid", c.EngagementId, "jmpv2_payoutkey");
            var e = prior == null ? new Entity("jmpv2_payoutreadiness") : new Entity("jmpv2_payoutreadiness", prior.Id);
            e["jmpv2_payoutkey"] = "payout:" + c.EngagementId; e["jmpv2_onboardingkey"] = o.GetAttributeValue<string>("jmpv2_onboardingkey"); e["jmpv2_authorprofilekey"] = o.GetAttributeValue<string>("jmpv2_authorprofilekey");
            e["jmpv2_onboardingrecordid"] = o.ToEntityReference();
            e["jmpv2_engagementid"] = c.EngagementId; e["jmpv2_requirement"] = required ? "REQUIRED" : "NOT_REQUIRED"; e["jmpv2_relationshipstatus"] = c.PayoutStatus;
            e["jmpv2_evidencereference"] = c.EvidenceReference; e["jmpv2_evidencechecksum"] = c.EvidenceChecksum; e["jmpv2_testclassification"] = c.TestClassification;
            if (prior == null) s.Create(e); else s.Update(e); Bump(s, o); Output(x, true, "PAYOUT_RECORDED", false, false);
        }

        private static void Evaluate(IOrganizationService s, IPluginExecutionContext x, Command c, bool persist)
        {
            var o = RequireOnboarding(s, x, c); if (o == null) return;
            var key = o.GetAttributeValue<string>("jmpv2_onboardingkey");
            var items = All(s, "jmpv2_onboardingitem", "jmpv2_onboardingkey", key, "jmpv2_classification", "jmpv2_status", "jmpv2_evidencereference");
            bool required = items.Any() && items.Where(i => i.GetAttributeValue<string>("jmpv2_classification") == "REQUIRED").All(i => i.GetAttributeValue<string>("jmpv2_status") == "COMPLETE" && !string.IsNullOrWhiteSpace(i.GetAttributeValue<string>("jmpv2_evidencereference")));
            var w = One(s, "jmpv2_workspaceprovisioning", "jmpv2_engagementid", c.EngagementId, "jmpv2_status", "jmpv2_workspacepath");
            bool workspace = w != null && (w.GetAttributeValue<string>("jmpv2_status") == "PROVISIONED" || w.GetAttributeValue<string>("jmpv2_status") == "ALREADY_EXISTS") && w.GetAttributeValue<string>("jmpv2_workspacepath").StartsWith("/01_Pipeline_A-Z", StringComparison.Ordinal);
            var a = One(s, "jmpv2_authoraccess", "jmpv2_engagementid", c.EngagementId, "jmpv2_status", "jmpv2_evidencereference");
            bool access = a != null && a.GetAttributeValue<string>("jmpv2_status") == "READY" && !string.IsNullOrWhiteSpace(a.GetAttributeValue<string>("jmpv2_evidencereference"));
            var p = One(s, "jmpv2_payoutreadiness", "jmpv2_engagementid", c.EngagementId, "jmpv2_requirement", "jmpv2_relationshipstatus", "jmpv2_evidencereference");
            bool payout = p != null && (p.GetAttributeValue<string>("jmpv2_requirement") == "NOT_REQUIRED" || (p.GetAttributeValue<string>("jmpv2_relationshipstatus") == "READY" && !string.IsNullOrWhiteSpace(p.GetAttributeValue<string>("jmpv2_evidencereference"))));
            bool complete = required && workspace && access && payout;
            x.OutputParameters["RequiredItemsSatisfied"] = required; x.OutputParameters["WorkspaceReady"] = workspace; x.OutputParameters["AuthorAccessReady"] = access; x.OutputParameters["PayoutSatisfied"] = payout; x.OutputParameters["OnboardingComplete"] = complete; x.OutputParameters["Eligible06To07"] = complete;
            if (persist)
            {
                var update = new Entity("jmpv2_onboardingrecord", o.Id); update["jmpv2_completenessstatus"] = complete ? "COMPLETE" : "INCOMPLETE"; update["jmpv2_completenessreasons"] = Reasons(required, workspace, access, payout); update["jmpv2_recordversion"] = (o.GetAttributeValue<int?>("jmpv2_recordversion") ?? 0) + 1; s.Update(update);
                if (complete && One(s, "jmpv2_onboardingcompletionevent", "jmpv2_onboardingkey", key, "jmpv2_completionkey") == null)
                {
                    var ev = new Entity("jmpv2_onboardingcompletionevent");
                    ev["jmpv2_completionkey"] = "completion:" + key;
                    ev["jmpv2_onboardingkey"] = key;
                    ev["jmpv2_onboardingrecordid"] = o.ToEntityReference();
                    ev["jmpv2_authorprofilekey"] = o.GetAttributeValue<string>("jmpv2_authorprofilekey");
                    ev["jmpv2_engagementid"] = c.EngagementId;
                    ev["jmpv2_completionstatus"] = "DERIVED_COMPLETE";
                    ev["jmpv2_reasoncode"] = "ALL_GOVERNED_PREREQUISITES_SATISFIED";
                    ev["jmpv2_evidencechecksum"] = Hash(key + "|" + o.GetAttributeValue<int?>("jmpv2_recordversion"));
                    ev["jmpv2_idempotencykey"] = c.IdempotencyKey;
                    ev["jmpv2_testclassification"] = c.TestClassification;
                    ev["jmpv2_completedat"] = DateTime.UtcNow;
                    s.Create(ev);
                }
            }
            Output(x, true, complete ? "ONBOARDING_COMPLETE" : "ONBOARDING_INCOMPLETE", false, complete);
        }

        private static Entity RequireOnboarding(IOrganizationService s, IPluginExecutionContext x, Command c)
        {
            var o = One(s, "jmpv2_onboardingrecord", "jmpv2_engagementid", c.EngagementId, "jmpv2_onboardingkey", "jmpv2_engagementid", "jmpv2_authorprofilekey", "jmpv2_titleid", "jmpv2_recordversion");
            if (o == null) Output(x, false, "UNKNOWN_ENGAGEMENT", false, false); return o;
        }
        private static bool EnvironmentEnabled(IOrganizationService s)
        {
            var definitionQuery = new QueryExpression("environmentvariabledefinition")
            {
                ColumnSet = new ColumnSet("environmentvariabledefinitionid", "defaultvalue"),
                TopCount = 1
            };
            definitionQuery.Criteria.AddCondition("schemaname", ConditionOperator.Equal, EnabledEnvironmentVariable);
            var definition = s.RetrieveMultiple(definitionQuery).Entities.FirstOrDefault();
            if (definition == null) return false;

            var valueQuery = new QueryExpression("environmentvariablevalue")
            {
                ColumnSet = new ColumnSet("value", "createdon"),
                TopCount = 1
            };
            valueQuery.Criteria.AddCondition("environmentvariabledefinitionid", ConditionOperator.Equal, definition.Id);
            valueQuery.AddOrder("createdon", OrderType.Descending);
            var current = s.RetrieveMultiple(valueQuery).Entities.FirstOrDefault()?.GetAttributeValue<string>("value");
            var effective = string.IsNullOrWhiteSpace(current) ? definition.GetAttributeValue<string>("defaultvalue") : current;
            return string.Equals(effective, "true", StringComparison.OrdinalIgnoreCase);
        }
        private static bool CheckVersion(IPluginExecutionContext x, Command c, Entity o) { var v = o.GetAttributeValue<int?>("jmpv2_recordversion") ?? 1; if (c.ExpectedVersion != v) { Output(x, false, "STALE_VERSION", false, false); return false; } x.OutputParameters["RecordVersion"] = v + 1; return true; }
        private static void Bump(IOrganizationService s, Entity o) { var e = new Entity("jmpv2_onboardingrecord", o.Id); e["jmpv2_recordversion"] = (o.GetAttributeValue<int?>("jmpv2_recordversion") ?? 1) + 1; s.Update(e); }
        private static string Reasons(bool i, bool w, bool a, bool p) => string.Join(";", new[] { i ? null : "MISSING_REQUIRED_ITEM", w ? null : "WORKSPACE_NOT_READY", a ? null : "INCOMPLETE_ACCESS", p ? null : "UNSATISFIED_PAYOUT_REQUIREMENT" }.Where(v => v != null));
        private static Entity TryRetrieve(IOrganizationService s, string name, Guid id, params string[] cols) { try { return s.Retrieve(name, id, new ColumnSet(cols)); } catch { return null; } }
        private static Entity One(IOrganizationService s, string name, string field, string value, params string[] cols) { if (string.IsNullOrWhiteSpace(value)) return null; var q = new QueryExpression(name) { ColumnSet = new ColumnSet(cols), TopCount = 1 }; q.Criteria.AddCondition(field, ConditionOperator.Equal, value); return s.RetrieveMultiple(q).Entities.FirstOrDefault(); }
        private static Entity[] All(IOrganizationService s, string name, string field, string value, params string[] cols) { var q = new QueryExpression(name) { ColumnSet = new ColumnSet(cols) }; q.Criteria.AddCondition(field, ConditionOperator.Equal, value); return s.RetrieveMultiple(q).Entities.ToArray(); }
        private static string Hash(string value) { using (var sha = SHA256.Create()) return BitConverter.ToString(sha.ComputeHash(Encoding.UTF8.GetBytes(value))).Replace("-", "").ToLowerInvariant(); }
        private static void Output(IPluginExecutionContext x, bool accepted, string reason, bool replay, bool complete) { x.OutputParameters["Accepted"] = accepted; x.OutputParameters["ReasonCode"] = reason; x.OutputParameters["Replay"] = replay; if (!x.OutputParameters.Contains("OnboardingComplete")) x.OutputParameters["OnboardingComplete"] = complete; if (!x.OutputParameters.Contains("Eligible06To07")) x.OutputParameters["Eligible06To07"] = false; }
        private static string S(IPluginExecutionContext x, string n) => x.InputParameters.Contains(n) ? Convert.ToString(x.InputParameters[n]) : "";
        private static Command Read(IPluginExecutionContext x) => new Command { Operation=S(x,"Command"), CanonicalContactId=S(x,"CanonicalContactId"), AuthorName=S(x,"AuthorName"), Email=S(x,"Email"), EngagementId=S(x,"EngagementId"), LifecycleId=S(x,"LifecycleId"), TitleId=S(x,"TitleId"), PolicyVersion=S(x,"PolicyVersion"), ItemType=S(x,"ItemType"), Classification=S(x,"Classification"), ItemStatus=S(x,"ItemStatus"), EvidenceReference=S(x,"EvidenceReference"), EvidenceChecksum=S(x,"EvidenceChecksum"), EvidenceEngagementId=S(x,"EvidenceEngagementId"), WorkspaceStatus=S(x,"WorkspaceStatus"), WorkspacePath=S(x,"WorkspacePath"), WorkspaceItemId=S(x,"WorkspaceItemId"), AccessStatus=S(x,"AccessStatus"), PayoutRequired=S(x,"PayoutRequired"), PayoutStatus=S(x,"PayoutStatus"), Actor=S(x,"Actor"), AuthorityContext=S(x,"AuthorityContext"), CorrelationId=S(x,"CorrelationId"), IdempotencyKey=S(x,"IdempotencyKey"), TestClassification=S(x,"TestClassification"), ExpectedVersion=x.InputParameters.Contains("ExpectedVersion") ? Convert.ToInt32(x.InputParameters["ExpectedVersion"]) : 0 };
        private sealed class Command { public string Operation,CanonicalContactId,AuthorName,Email,EngagementId,LifecycleId,TitleId,PolicyVersion,ItemType,Classification,ItemStatus,EvidenceReference,EvidenceChecksum,EvidenceEngagementId,WorkspaceStatus,WorkspacePath,WorkspaceItemId,AccessStatus,PayoutRequired,PayoutStatus,Actor,AuthorityContext,CorrelationId,IdempotencyKey,TestClassification; public int ExpectedVersion; }
    }

    public sealed class Phase6CompletionWriteGuardPlugin : IPlugin
    {
        public void Execute(IServiceProvider provider)
        {
            var x = (IPluginExecutionContext)provider.GetService(typeof(IPluginExecutionContext));
            if (x.Depth > 1) return;
            if (x.PrimaryEntityName == "jmpv2_onboardingcompletionevent" || (x.PrimaryEntityName == "jmpv2_onboardingrecord" && x.MessageName == "Update"))
                throw new InvalidPluginExecutionException("DIRECT_ONBOARDING_COMPLETION_WRITE_DENIED");
        }
    }
}
