using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;
using System;
using System.Linq;
using System.Security.Cryptography;
using System.Text;

namespace plugin
{
    public sealed class V2RequestTransitionPlugin : IPlugin
    {
        private static readonly string[] Stages =
        {
            "01_INQUIRY", "02_INTAKE", "03_EDITORIAL_REVIEW", "04_AUTHOR_DECISION",
            "05_AGREEMENT_PAYMENT", "06_ONBOARDING", "07_DEVELOPMENTAL_EDITING",
            "08_LINE_EDITING", "09_COPYEDITING", "10_PROOFREADING", "11_INTERIOR_LAYOUT",
            "12_COVER_DESIGN", "13_PRODUCTION", "14_DISTRIBUTION", "15_PUBLICATION",
            "16_POST_PUBLICATION"
        };

        public V2RequestTransitionPlugin() { }
        public V2RequestTransitionPlugin(string unsecureConfiguration, string secureConfiguration) { }

        public void Execute(IServiceProvider provider)
        {
            var context = (IPluginExecutionContext)provider.GetService(typeof(IPluginExecutionContext));
            var factory = (IOrganizationServiceFactory)provider.GetService(typeof(IOrganizationServiceFactory));
            var service = factory.CreateOrganizationService(context.UserId);

            if (IsDirectLifecycleStateWrite(context))
                throw new InvalidPluginExecutionException("DIRECT_CURRENT_STATE_WRITE_DENIED");
            if (string.Equals(context.MessageName, "Update", StringComparison.OrdinalIgnoreCase))
                return;

            var command = ReadCommand(context);
            var commandHash = Hash(command.Normalized);
            try
            {
                ExecuteTransition(service, context, command, commandHash);
            }
            catch (InvalidPluginExecutionException) { throw; }
            catch (Exception ex)
            {
                throw new InvalidPluginExecutionException("PHASE1B_TRANSITION_PLUGIN_ERROR:" + ex.Message, ex);
            }
        }

        private static bool IsDirectLifecycleStateWrite(IPluginExecutionContext context)
        {
            if (!string.Equals(context.MessageName, "Update", StringComparison.OrdinalIgnoreCase) ||
                !string.Equals(context.PrimaryEntityName, "jmpv2_lifecycleinstance", StringComparison.OrdinalIgnoreCase) ||
                !context.InputParameters.Contains("Target") || !(context.InputParameters["Target"] is Entity target))
                return false;

            var touchesState = target.Attributes.ContainsKey("jmpv2_currentstagecode") ||
                target.Attributes.ContainsKey("jmpv2_currentstageinstancekey") ||
                target.Attributes.ContainsKey("jmpv2_lifecycleversion");
            return touchesState && context.Depth <= 1;
        }

        private static void ExecuteTransition(IOrganizationService service, IPluginExecutionContext context, Command command, string commandHash)
        {
            var existing = FindTransitionByIdempotency(service, command.IdempotencyKey);
            if (existing != null)
            {
                if (existing.GetAttributeValue<string>("jmpv2_causationid") != commandHash)
                {
                    Deny(service, context, command, commandHash, "DUPLICATE_COMMAND");
                    return;
                }

                var lifecycle = RequireLifecycle(service, command.LifecycleInstanceId);
                var targetStage = existing.GetAttributeValue<string>("jmpv2_tostagecode");
                if (lifecycle.GetAttributeValue<bool?>("jmpv2_isactive") == false ||
                    lifecycle.GetAttributeValue<string>("jmpv2_currentstagecode") != targetStage)
                    throw new InvalidPluginExecutionException("TRANSITION_REPLAY_LIFECYCLE_CONFLICT");

                EnsureEngagementProjection(service, command, targetStage);
                SetOutput(context, true, "ELIGIBLE", existing.GetAttributeValue<string>("jmpv2_transitionkey"), targetStage, true);
                return;
            }

            var lifecycleEntity = RequireLifecycle(service, command.LifecycleInstanceId);
            if (lifecycleEntity.GetAttributeValue<bool?>("jmpv2_isactive") == false)
            {
                Deny(service, context, command, commandHash, "INACTIVE_LIFECYCLE");
                return;
            }
            if (command.Actor != "phase1b-authorized-actor")
            {
                Deny(service, context, command, commandHash, "UNAUTHORIZED_ACTOR");
                return;
            }
            if (command.AuthorityContext != "V2_TRANSITION_AUTHORITY")
            {
                Deny(service, context, command, commandHash, "AMBIGUOUS_AUTHORITY");
                return;
            }

            var currentStage = lifecycleEntity.GetAttributeValue<string>("jmpv2_currentstagecode");
            var lifecycleVersion = lifecycleEntity.GetAttributeValue<int?>("jmpv2_lifecycleversion") ?? 0;
            if (command.ExpectedVersion.HasValue && command.ExpectedVersion.Value != lifecycleVersion)
            {
                Deny(service, context, command, commandHash, "STALE_COMMAND");
                return;
            }
            if (command.ExpectedCurrentStage != currentStage)
            {
                Deny(service, context, command, commandHash, "WRONG_EXPECTED_CURRENT_STAGE");
                return;
            }

            var currentIndex = Array.IndexOf(Stages, currentStage);
            var nextIndex = Array.IndexOf(Stages, command.RequestedNextStage);
            if (nextIndex < 0)
            {
                Deny(service, context, command, commandHash, "INVALID_NEXT_STAGE");
                return;
            }
            if (nextIndex != currentIndex + 1)
            {
                Deny(service, context, command, commandHash, "SKIPPED_STAGE");
                return;
            }

            var timestamp = DateTime.UtcNow;
            var lifecycleKey = lifecycleEntity.GetAttributeValue<string>("jmpv2_lifecyclekey");
            var transitionKey = "phase1b-transition-" + Guid.NewGuid();
            var nextStageKey = "phase1b-stage-" + Guid.NewGuid();

            ClosePriorStage(service, lifecycleEntity.GetAttributeValue<string>("jmpv2_currentstageinstancekey"), transitionKey, timestamp);
            service.Create(new Entity("jmpv2_stageinstance")
            {
                ["jmpv2_stageinstancekey"] = nextStageKey,
                ["jmpv2_lifecyclekey"] = lifecycleKey,
                ["jmpv2_stagecode"] = command.RequestedNextStage,
                ["jmpv2_status"] = "OPEN",
                ["jmpv2_openedat"] = timestamp,
                ["jmpv2_openedbytransitionkey"] = transitionKey
            });
            service.Create(new Entity("jmpv2_transitionevent")
            {
                ["jmpv2_transitionkey"] = transitionKey,
                ["jmpv2_lifecyclekey"] = lifecycleKey,
                ["jmpv2_fromstagecode"] = currentStage,
                ["jmpv2_tostagecode"] = command.RequestedNextStage,
                ["jmpv2_actor"] = command.Actor,
                ["jmpv2_authoritycontext"] = command.AuthorityContext,
                ["jmpv2_correlationid"] = command.CorrelationId,
                ["jmpv2_causationid"] = commandHash,
                ["jmpv2_idempotencykey"] = command.IdempotencyKey,
                ["jmpv2_eligibilityresult"] = "ELIGIBLE",
                ["jmpv2_reasoncode"] = "ELIGIBLE",
                ["jmpv2_proofreference"] = "PHASE1B_DATAVERSE_PREDECESSOR_PROOF",
                ["jmpv2_environment"] = ResolveEnvironment(service),
                ["jmpv2_eventtimestamp"] = timestamp
            });
            service.Update(new Entity("jmpv2_lifecycleinstance", lifecycleEntity.Id)
            {
                ["jmpv2_currentstagecode"] = command.RequestedNextStage,
                ["jmpv2_currentstageinstancekey"] = nextStageKey,
                ["jmpv2_lifecycleversion"] = lifecycleVersion + 1
            });
            EnsureEngagementProjection(service, command, command.RequestedNextStage);
            WriteExecutionEvent(service, command, commandHash, transitionKey, "TRANSITION_ACCEPTED", "ELIGIBLE");
            SetOutput(context, true, "ELIGIBLE", transitionKey, command.RequestedNextStage, false);
        }

        private static Entity RequireLifecycle(IOrganizationService service, string lifecycleInstanceId)
        {
            if (!Guid.TryParse(lifecycleInstanceId, out var lifecycleId))
                throw new InvalidPluginExecutionException("UNKNOWN_LIFECYCLE_INSTANCE");
            try
            {
                return service.Retrieve("jmpv2_lifecycleinstance", lifecycleId, new ColumnSet(
                    "jmpv2_lifecyclekey", "jmpv2_currentstagecode", "jmpv2_currentstageinstancekey",
                    "jmpv2_lifecycleversion", "jmpv2_isactive"));
            }
            catch (Exception ex)
            {
                throw new InvalidPluginExecutionException("UNKNOWN_LIFECYCLE_INSTANCE:" + ex.Message, ex);
            }
        }

        private static void EnsureEngagementProjection(IOrganizationService service, Command command, string targetStage)
        {
            var query = new QueryExpression("jmpv2_publishingengagement")
            {
                ColumnSet = new ColumnSet("jmpv2_publishingengagementid", "jmpv2_currentstage")
            };
            query.Criteria.AddCondition("jmpv2_lifecycleinstanceid", ConditionOperator.Equal, command.LifecycleInstanceId);
            query.Criteria.AddCondition("statecode", ConditionOperator.Equal, 0);
            var engagements = service.RetrieveMultiple(query).Entities;
            if (engagements.Count != 1)
                throw new InvalidPluginExecutionException("ENGAGEMENT_PROJECTION_CARDINALITY_INVALID");

            var engagement = engagements.Single();
            var currentProjection = engagement.GetAttributeValue<string>("jmpv2_currentstage");
            if (currentProjection == targetStage) return;
            if (currentProjection != command.ExpectedCurrentStage)
                throw new InvalidPluginExecutionException("ENGAGEMENT_PROJECTION_CONFLICT");

            service.Update(new Entity("jmpv2_publishingengagement", engagement.Id)
            {
                ["jmpv2_currentstage"] = targetStage,
                ["jmpv2_correlationid"] = command.CorrelationId
            });
        }

        private static void ClosePriorStage(IOrganizationService service, string priorStageKey, string transitionKey, DateTime timestamp)
        {
            var query = new QueryExpression("jmpv2_stageinstance") { ColumnSet = new ColumnSet("jmpv2_stageinstanceid") };
            query.Criteria.AddCondition("jmpv2_stageinstancekey", ConditionOperator.Equal, priorStageKey);
            var prior = service.RetrieveMultiple(query).Entities.FirstOrDefault();
            if (prior == null) return;
            service.Update(new Entity("jmpv2_stageinstance", prior.Id)
            {
                ["jmpv2_status"] = "CLOSED",
                ["jmpv2_closedat"] = timestamp,
                ["jmpv2_closedbytransitionkey"] = transitionKey
            });
        }

        private static Entity FindTransitionByIdempotency(IOrganizationService service, string idempotencyKey)
        {
            var query = new QueryExpression("jmpv2_transitionevent")
            {
                ColumnSet = new ColumnSet("jmpv2_transitionkey", "jmpv2_causationid", "jmpv2_tostagecode")
            };
            query.Criteria.AddCondition("jmpv2_idempotencykey", ConditionOperator.Equal, idempotencyKey);
            return service.RetrieveMultiple(query).Entities.FirstOrDefault();
        }

        private static void Deny(IOrganizationService service, IPluginExecutionContext context, Command command, string commandHash, string reasonCode)
        {
            WriteExecutionEvent(service, command, commandHash, null, "TRANSITION_DENIED", reasonCode);
            SetOutput(context, false, reasonCode, null, null, false);
        }

        private static void WriteExecutionEvent(IOrganizationService service, Command command, string commandHash, string transitionKey, string eventType, string reasonCode)
        {
            service.Create(new Entity("jmpv2_executionevent")
            {
                ["jmpv2_executionkey"] = "phase1b-execution-" + Guid.NewGuid(),
                ["jmpv2_lifecyclekey"] = command.LifecycleInstanceId,
                ["jmpv2_transitionkey"] = transitionKey ?? string.Empty,
                ["jmpv2_eventtype"] = eventType,
                ["jmpv2_sourcecomponent"] = "DATAVERSE_CUSTOM_API_PLUGIN",
                ["jmpv2_result"] = reasonCode == "ELIGIBLE" ? "PASS" : "DENIED",
                ["jmpv2_reasoncode"] = reasonCode,
                ["jmpv2_correlationid"] = command.CorrelationId,
                ["jmpv2_causationid"] = commandHash,
                ["jmpv2_environment"] = ResolveEnvironment(service),
                ["jmpv2_eventtimestamp"] = DateTime.UtcNow
            });
        }

        private static string ResolveEnvironment(IOrganizationService service)
        {
            var query = new QueryExpression("jmpv2_environmentauthority")
            {
                ColumnSet = new ColumnSet("jmpv2_environmentname"),
                TopCount = 1
            };
            query.Criteria.AddCondition("jmpv2_isactive", ConditionOperator.Equal, true);
            var authority = service.RetrieveMultiple(query).Entities.FirstOrDefault();
            if (authority == null) throw new InvalidPluginExecutionException("ENVIRONMENT_AUTHORITY_NOT_CONFIGURED");
            return authority.GetAttributeValue<string>("jmpv2_environmentname");
        }

        private static void SetOutput(IPluginExecutionContext context, bool accepted, string reasonCode, string transitionId, string currentStage, bool replay)
        {
            context.OutputParameters["Accepted"] = accepted;
            context.OutputParameters["ReasonCode"] = reasonCode;
            context.OutputParameters["TransitionId"] = transitionId ?? string.Empty;
            context.OutputParameters["CurrentStage"] = currentStage ?? string.Empty;
            context.OutputParameters["Replay"] = replay;
        }

        private static Command ReadCommand(IPluginExecutionContext context)
        {
            string Read(string name)
            {
                if (context.InputParameters.Contains(name)) return Convert.ToString(context.InputParameters[name]);
                foreach (var prefix in new[] { "jmpv2_RequestTransitionV2.", "jmpv2_RequestTransition." })
                {
                    var prefixed = prefix + name;
                    if (context.InputParameters.Contains(prefixed)) return Convert.ToString(context.InputParameters[prefixed]);
                }
                return string.Empty;
            }
            int? ReadInt(string name)
            {
                object value = context.InputParameters.Contains(name) ? context.InputParameters[name] : null;
                foreach (var prefix in new[] { "jmpv2_RequestTransitionV2.", "jmpv2_RequestTransition." })
                {
                    var prefixed = prefix + name;
                    if (value == null && context.InputParameters.Contains(prefixed)) value = context.InputParameters[prefixed];
                }
                if (value == null || !int.TryParse(Convert.ToString(value), out var parsed)) return null;
                return parsed;
            }
            var command = new Command
            {
                LifecycleInstanceId = Read("LifecycleInstanceId"),
                ExpectedCurrentStage = Read("ExpectedCurrentStage"),
                RequestedNextStage = Read("RequestedNextStage"),
                Actor = Read("Actor"), AuthorityContext = Read("AuthorityContext"),
                CorrelationId = Read("CorrelationId") == string.Empty ? Read("V2CorrelationId") : Read("CorrelationId"),
                IdempotencyKey = Read("IdempotencyKey"), ExpectedVersion = ReadInt("ExpectedVersion")
            };
            command.Normalized = string.Join("|", command.LifecycleInstanceId, command.ExpectedCurrentStage,
                command.RequestedNextStage, command.Actor, command.AuthorityContext, command.CorrelationId,
                command.IdempotencyKey, command.ExpectedVersion);
            return command;
        }

        private static string Hash(string value)
        {
            using (var sha = SHA256.Create())
                return BitConverter.ToString(sha.ComputeHash(Encoding.UTF8.GetBytes(value))).Replace("-", "").ToLowerInvariant();
        }

        private sealed class Command
        {
            public string LifecycleInstanceId, ExpectedCurrentStage, RequestedNextStage, Actor,
                AuthorityContext, CorrelationId, IdempotencyKey, Normalized;
            public int? ExpectedVersion;
        }
    }
}
