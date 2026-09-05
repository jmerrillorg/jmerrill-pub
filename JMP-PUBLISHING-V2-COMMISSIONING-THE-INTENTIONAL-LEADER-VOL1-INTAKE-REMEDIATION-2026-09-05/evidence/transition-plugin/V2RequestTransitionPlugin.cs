using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;
using System;
using System.Linq;
using System.Security.Cryptography;
using System.Text;

namespace plugin
{
    public class V2RequestTransitionPlugin : PluginBase
    {
        private static readonly string[] Stages =
        {
            "01_INQUIRY",
            "02_INTAKE",
            "03_EDITORIAL_REVIEW",
            "04_AUTHOR_DECISION",
            "05_AGREEMENT_PAYMENT",
            "06_ONBOARDING",
            "07_DEVELOPMENTAL_EDITING",
            "08_LINE_EDITING",
            "09_COPYEDITING",
            "10_PROOFREADING",
            "11_INTERIOR_LAYOUT",
            "12_COVER_DESIGN",
            "13_PRODUCTION",
            "14_DISTRIBUTION",
            "15_PUBLICATION",
            "16_POST_PUBLICATION"
        };

        public V2RequestTransitionPlugin(string unsecureConfiguration, string secureConfiguration)
            : base(typeof(V2RequestTransitionPlugin))
        {
        }

        protected override void ExecuteDataversePlugin(ILocalPluginContext localPluginContext)
        {
            if (localPluginContext == null)
            {
                throw new ArgumentNullException(nameof(localPluginContext));
            }

            var context = localPluginContext.PluginExecutionContext;
            var service = localPluginContext.PluginUserService;

            if (IsDirectLifecycleStateWrite(context))
            {
                throw new InvalidPluginExecutionException("DIRECT_CURRENT_STATE_WRITE_DENIED");
            }

            var command = ReadCommand(context);
            var commandHash = Hash(command.Normalized);

            try
            {
                ExecuteTransition(service, context, command, commandHash);
            }
            catch (InvalidPluginExecutionException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new InvalidPluginExecutionException($"PHASE1B_TRANSITION_PLUGIN_ERROR:{ex.Message}", ex);
            }
        }

        private static bool IsDirectLifecycleStateWrite(IPluginExecutionContext context)
        {
            if (!string.Equals(context.MessageName, "Update", StringComparison.OrdinalIgnoreCase)) return false;
            if (!string.Equals(context.PrimaryEntityName, "jmpv2_lifecycleinstance", StringComparison.OrdinalIgnoreCase)) return false;
            if (!context.InputParameters.Contains("Target") || !(context.InputParameters["Target"] is Entity target)) return false;

            var touchesState =
                target.Attributes.ContainsKey("jmpv2_currentstagecode") ||
                target.Attributes.ContainsKey("jmpv2_currentstageinstancekey") ||
                target.Attributes.ContainsKey("jmpv2_lifecycleversion");

            if (!touchesState) return false;

            return context.Depth <= 1;
        }

        private static void ExecuteTransition(IOrganizationService service, IPluginExecutionContext context, Command command, string commandHash)
        {
            var existing = FindTransitionByIdempotency(service, command.IdempotencyKey);
            if (existing != null)
            {
                var existingHash = existing.GetAttributeValue<string>("jmpv2_causationid");
                if (existingHash == commandHash)
                {
                    SetOutput(context, true, "ELIGIBLE", existing.GetAttributeValue<string>("jmpv2_transitionkey"), existing.GetAttributeValue<string>("jmpv2_tostagecode"), true);
                    return;
                }

                Deny(service, context, command, commandHash, "DUPLICATE_COMMAND");
                return;
            }

            if (!Guid.TryParse(command.LifecycleInstanceId, out var lifecycleId))
            {
                Deny(service, context, command, commandHash, "UNKNOWN_LIFECYCLE_INSTANCE");
                return;
            }

            Entity lifecycle;
            try
            {
                lifecycle = service.Retrieve("jmpv2_lifecycleinstance", lifecycleId, new ColumnSet(
                    "jmpv2_lifecyclekey",
                    "jmpv2_currentstagecode",
                    "jmpv2_currentstageinstancekey",
                    "jmpv2_lifecycleversion",
                    "jmpv2_isactive"));
            }
            catch
            {
                Deny(service, context, command, commandHash, "UNKNOWN_LIFECYCLE_INSTANCE");
                return;
            }

            if (lifecycle.GetAttributeValue<bool?>("jmpv2_isactive") == false)
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

            var currentStage = lifecycle.GetAttributeValue<string>("jmpv2_currentstagecode");
            var lifecycleVersion = lifecycle.GetAttributeValue<int?>("jmpv2_lifecycleversion") ?? 0;
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
            var lifecycleKey = lifecycle.GetAttributeValue<string>("jmpv2_lifecyclekey");
            var priorStageKey = lifecycle.GetAttributeValue<string>("jmpv2_currentstageinstancekey");
            var transitionKey = $"phase1b-transition-{Guid.NewGuid()}";
            var nextStageKey = $"phase1b-stage-{Guid.NewGuid()}";

            ClosePriorStage(service, priorStageKey, transitionKey, timestamp);

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

            service.Update(new Entity("jmpv2_lifecycleinstance", lifecycle.Id)
            {
                ["jmpv2_currentstagecode"] = command.RequestedNextStage,
                ["jmpv2_currentstageinstancekey"] = nextStageKey,
                ["jmpv2_lifecycleversion"] = lifecycleVersion + 1
            });

            WriteExecutionEvent(service, command, commandHash, transitionKey, "TRANSITION_ACCEPTED", "ELIGIBLE");
            SetOutput(context, true, "ELIGIBLE", transitionKey, command.RequestedNextStage, false);
        }

        private static void ClosePriorStage(IOrganizationService service, string priorStageKey, string transitionKey, DateTime timestamp)
        {
            var query = new QueryExpression("jmpv2_stageinstance")
            {
                ColumnSet = new ColumnSet("jmpv2_stageinstanceid")
            };
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
                ["jmpv2_executionkey"] = $"phase1b-execution-{Guid.NewGuid()}",
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

        private static void SetOutput(IPluginExecutionContext context, bool accepted, string reasonCode, string transitionId, string currentStage, bool replay)
        {
            context.OutputParameters["Accepted"] = accepted;
            context.OutputParameters["ReasonCode"] = reasonCode;
            context.OutputParameters["TransitionId"] = transitionId ?? string.Empty;
            context.OutputParameters["CurrentStage"] = currentStage ?? string.Empty;
            context.OutputParameters["Replay"] = replay;
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
            if (authority == null)
                throw new InvalidPluginExecutionException("ENVIRONMENT_AUTHORITY_NOT_CONFIGURED");
            return authority.GetAttributeValue<string>("jmpv2_environmentname");
        }

        private static Command ReadCommand(IPluginExecutionContext context)
        {
            string Read(string name)
            {
                if (context.InputParameters.Contains(name)) return Convert.ToString(context.InputParameters[name]);
                var prefixedName = $"jmpv2_RequestTransition.{name}";
                return context.InputParameters.Contains(prefixedName) ? Convert.ToString(context.InputParameters[prefixedName]) : string.Empty;
            }
            int? ReadInt(string name)
            {
                object value = null;
                if (context.InputParameters.Contains(name)) value = context.InputParameters[name];
                var prefixedName = $"jmpv2_RequestTransition.{name}";
                if (value == null && context.InputParameters.Contains(prefixedName)) value = context.InputParameters[prefixedName];
                if (value == null) return null;
                if (int.TryParse(Convert.ToString(value), out var parsed)) return parsed;
                return null;
            }

            var command = new Command
            {
                LifecycleInstanceId = Read("LifecycleInstanceId"),
                ExpectedCurrentStage = Read("ExpectedCurrentStage"),
                RequestedNextStage = Read("RequestedNextStage"),
                Actor = Read("Actor"),
                AuthorityContext = Read("AuthorityContext"),
                CorrelationId = Read("CorrelationId") == string.Empty ? Read("V2CorrelationId") : Read("CorrelationId"),
                IdempotencyKey = Read("IdempotencyKey"),
                ExpectedVersion = ReadInt("ExpectedVersion")
            };
            command.Normalized = $"{command.LifecycleInstanceId}|{command.ExpectedCurrentStage}|{command.RequestedNextStage}|{command.Actor}|{command.AuthorityContext}|{command.CorrelationId}|{command.IdempotencyKey}|{command.ExpectedVersion}";
            return command;
        }

        private static string Hash(string value)
        {
            using (var sha = SHA256.Create())
            {
                return BitConverter.ToString(sha.ComputeHash(Encoding.UTF8.GetBytes(value))).Replace("-", "").ToLowerInvariant();
            }
        }

        private class Command
        {
            public string LifecycleInstanceId { get; set; }
            public string ExpectedCurrentStage { get; set; }
            public string RequestedNextStage { get; set; }
            public string Actor { get; set; }
            public string AuthorityContext { get; set; }
            public string CorrelationId { get; set; }
            public string IdempotencyKey { get; set; }
            public int? ExpectedVersion { get; set; }
            public string Normalized { get; set; }
        }
    }
}
