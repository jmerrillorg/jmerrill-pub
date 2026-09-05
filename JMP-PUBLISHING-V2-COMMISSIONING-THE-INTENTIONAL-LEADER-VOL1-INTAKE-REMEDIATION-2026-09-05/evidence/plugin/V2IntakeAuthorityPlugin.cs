using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.Serialization.Json;
using System.Text;

namespace plugin
{
    public class V2IntakeAuthorityPlugin : PluginBase
    {
        private static readonly string[] QuestionCodes = {
            "TARGET_AUDIENCE", "RIGHTS_PROVENANCE", "SENSITIVE_CONTENT",
            "ACCESSIBILITY_INFORMATION", "SERIES_INFORMATION"
        };

        private static readonly Dictionary<string, string> MissingReasons = new Dictionary<string, string> {
            { "TARGET_AUDIENCE", "MISSING_TARGET_AUDIENCE" },
            { "RIGHTS_PROVENANCE", "RIGHTS_PROVENANCE_DISCLOSURE_REQUIRES_CURRENT_CONFIRMATION" },
            { "SENSITIVE_CONTENT", "SENSITIVE_CONTENT_DISCLOSURE_REQUIRES_CURRENT_CONFIRMATION" },
            { "ACCESSIBILITY_INFORMATION", "ACCESSIBILITY_INFORMATION_REQUIRES_CURRENT_CONFIRMATION" },
            { "SERIES_INFORMATION", "SERIES_INFORMATION_REQUIRES_CURRENT_CONFIRMATION" }
        };

        public V2IntakeAuthorityPlugin(string unsecureConfiguration, string secureConfiguration)
            : base(typeof(V2IntakeAuthorityPlugin)) { }

        protected override void ExecuteDataversePlugin(ILocalPluginContext localPluginContext)
        {
            var context = localPluginContext.PluginExecutionContext;
            var service = localPluginContext.PluginUserService;

            var authorId = ParseGuid(Input(context, "AuthorContactId"), "INVALID_AUTHOR_ID");
            var engagementId = ParseGuid(Input(context, "PublishingEngagementId"), "INVALID_ENGAGEMENT_ID");
            var lifecycleId = ParseGuid(Input(context, "LifecycleInstanceId"), "INVALID_LIFECYCLE_ID");
            var intakeId = ParseGuid(Input(context, "IntakeSubmissionId"), "INVALID_INTAKE_ID");
            var mode = Input(context, "Mode").ToUpperInvariant();
            var authorityContext = Input(context, "AuthorityContext");
            var correlationId = Input(context, "V2CorrelationId");

            if (mode != "SAVE" && mode != "SUBMIT") Reject(context, "INVALID_MODE");
            if (string.IsNullOrWhiteSpace(authorityContext) || string.IsNullOrWhiteSpace(correlationId)) Reject(context, "MISSING_AUTHORITY_CONTEXT");

            var inquiry = service.Retrieve("jmpv2_inquiry", engagementId,
                new ColumnSet("jmpv2_inquirykey", "jmpv2_lifecycleid", "jmpv2_workingtitle"));
            var lifecycle = service.Retrieve("jmpv2_lifecycleinstance", lifecycleId,
                new ColumnSet("jmpv2_currentstagecode", "jmpv2_isactive"));
            var intake = service.Retrieve("jmpv2_intakesubmission", intakeId,
                new ColumnSet("jmpv2_intakekey", "jmpv2_inquirykey", "jmpv2_lifecycleid", "jmpv2_returningauthorcontactid"));

            if (!Equal(inquiry.GetAttributeValue<string>("jmpv2_lifecycleid"), lifecycleId.ToString())) Reject(context, "ENGAGEMENT_LIFECYCLE_MISMATCH");
            if (!Equal(intake.GetAttributeValue<string>("jmpv2_lifecycleid"), lifecycleId.ToString())) Reject(context, "INTAKE_LIFECYCLE_MISMATCH");
            if (!Equal(intake.GetAttributeValue<string>("jmpv2_inquirykey"), inquiry.GetAttributeValue<string>("jmpv2_inquirykey"))) Reject(context, "INTAKE_ENGAGEMENT_MISMATCH");
            if (!Equal(intake.GetAttributeValue<string>("jmpv2_returningauthorcontactid"), authorId.ToString())) Reject(context, "AUTHOR_NOT_AUTHORIZED");
            if (!Equal(lifecycle.GetAttributeValue<string>("jmpv2_currentstagecode"), "02_INTAKE")) Reject(context, "STAGE_NOT_INTAKE");
            if (lifecycle.GetAttributeValue<bool>("jmpv2_isactive") != true) Reject(context, "LIFECYCLE_NOT_ACTIVE");

            var environment = ResolveEnvironment(service, context.OrganizationId);
            var incoming = DeserializeResponses(Input(context, "ResponsesJson"));
            if (incoming.Keys.Any(key => !QuestionCodes.Contains(key))) Reject(context, "UNKNOWN_INTAKE_QUESTION");

            context.SharedVariables["JMPV2_INTAKE_AUTHORITY"] = correlationId;

            foreach (var pair in incoming)
                SaveResponse(service, intakeId, authorId, engagementId, lifecycleId, pair.Key, pair.Value,
                    mode, authorityContext, correlationId, environment);

            var current = LoadResponses(service, intakeId);
            var missing = QuestionCodes.Where(code => !current.ContainsKey(code) || string.IsNullOrWhiteSpace(current[code])).ToList();
            var complete = mode == "SUBMIT" && missing.Count == 0;
            var reasons = missing.Select(code => MissingReasons[code]).ToList();
            if (missing.Count == 0 && mode != "SUBMIT") reasons.Add("AUTHOR_SUBMISSION_REQUIRED");

            var intakeUpdate = new Entity("jmpv2_intakesubmission", intakeId) {
                ["jmpv2_completenessstatus"] = complete ? "COMPLETE" : (missing.Count == 0 ? "READY_TO_SUBMIT" : "REQUIRES_CLARIFICATION"),
                ["jmpv2_completenessreasons"] = string.Join(";", reasons)
            };
            if (complete) intakeUpdate["jmpv2_submittedat"] = DateTime.UtcNow;
            service.Update(intakeUpdate);

            context.OutputParameters["Accepted"] = true;
            context.OutputParameters["ReasonCode"] = complete ? "INTAKE_COMPLETE" : (missing.Count == 0 ? "READY_TO_SUBMIT" : "INTAKE_INCOMPLETE");
            context.OutputParameters["CompletenessStatus"] = complete ? "COMPLETE" : (missing.Count == 0 ? "READY_TO_SUBMIT" : "REQUIRES_CLARIFICATION");
            context.OutputParameters["CompletenessReasons"] = string.Join(";", reasons);
            context.OutputParameters["OutstandingCount"] = missing.Count;
            context.OutputParameters["Environment"] = environment;
        }

        private static void SaveResponse(IOrganizationService service, Guid intakeId, Guid authorId, Guid engagementId,
            Guid lifecycleId, string code, string value, string mode, string authorityContext, string correlationId, string environment)
        {
            var query = new QueryExpression("jmpv2_intakeresponse") {
                ColumnSet = new ColumnSet("jmpv2_intakeresponseid", "jmpv2_responseversion"),
                TopCount = 1
            };
            query.Criteria.AddCondition("jmpv2_intakesubmissionid", ConditionOperator.Equal, intakeId.ToString());
            query.Criteria.AddCondition("jmpv2_questioncode", ConditionOperator.Equal, code);
            var existing = service.RetrieveMultiple(query).Entities.FirstOrDefault();
            var row = existing == null ? new Entity("jmpv2_intakeresponse") : new Entity("jmpv2_intakeresponse", existing.Id);
            row["jmpv2_responsekey"] = intakeId.ToString("D") + ":" + code;
            row["jmpv2_authorcontactid"] = authorId.ToString("D");
            row["jmpv2_publishingengagementid"] = engagementId.ToString("D");
            row["jmpv2_lifecycleinstanceid"] = lifecycleId.ToString("D");
            row["jmpv2_intakesubmissionid"] = intakeId.ToString("D");
            row["jmpv2_questioncode"] = code;
            row["jmpv2_fieldname"] = code;
            row["jmpv2_responsevalue"] = value ?? string.Empty;
            row["jmpv2_responseversion"] = (existing == null ? 0 : existing.GetAttributeValue<int>("jmpv2_responseversion")) + 1;
            row["jmpv2_submissionstatus"] = mode == "SUBMIT" ? "SUBMITTED" : "DRAFT";
            row["jmpv2_authoritycontext"] = authorityContext;
            row["jmpv2_correlationid"] = correlationId;
            row["jmpv2_environment"] = environment;
            row["jmpv2_updatedat"] = DateTime.UtcNow;
            if (existing == null) service.Create(row); else service.Update(row);
        }

        private static Dictionary<string, string> LoadResponses(IOrganizationService service, Guid intakeId)
        {
            var query = new QueryExpression("jmpv2_intakeresponse") { ColumnSet = new ColumnSet("jmpv2_questioncode", "jmpv2_responsevalue") };
            query.Criteria.AddCondition("jmpv2_intakesubmissionid", ConditionOperator.Equal, intakeId.ToString());
            return service.RetrieveMultiple(query).Entities
                .Where(row => !string.IsNullOrWhiteSpace(row.GetAttributeValue<string>("jmpv2_questioncode")))
                .GroupBy(row => row.GetAttributeValue<string>("jmpv2_questioncode"))
                .ToDictionary(group => group.Key, group => group.Last().GetAttributeValue<string>("jmpv2_responsevalue") ?? string.Empty);
        }

        private static string ResolveEnvironment(IOrganizationService service, Guid organizationId)
        {
            var query = new QueryExpression("jmpv2_environmentauthority") { ColumnSet = new ColumnSet("jmpv2_environmentname"), TopCount = 1 };
            query.Criteria.AddCondition("jmpv2_organizationid", ConditionOperator.Equal, organizationId.ToString("D"));
            query.Criteria.AddCondition("jmpv2_isactive", ConditionOperator.Equal, true);
            var row = service.RetrieveMultiple(query).Entities.FirstOrDefault();
            if (row == null) throw new InvalidPluginExecutionException("ENVIRONMENT_AUTHORITY_NOT_CONFIGURED");
            return row.GetAttributeValue<string>("jmpv2_environmentname");
        }

        private static Dictionary<string, string> DeserializeResponses(string json)
        {
            if (string.IsNullOrWhiteSpace(json)) return new Dictionary<string, string>();
            var serializer = new DataContractJsonSerializer(
                typeof(Dictionary<string, string>),
                new DataContractJsonSerializerSettings { UseSimpleDictionaryFormat = true });
            using (var stream = new MemoryStream(Encoding.UTF8.GetBytes(json)))
                return (Dictionary<string, string>)serializer.ReadObject(stream);
        }

        private static string Input(IPluginExecutionContext context, string name) =>
            context.InputParameters.Contains(name) ? Convert.ToString(context.InputParameters[name]) ?? string.Empty : string.Empty;

        private static Guid ParseGuid(string value, string reason) {
            Guid parsed; if (!Guid.TryParse(value, out parsed)) throw new InvalidPluginExecutionException(reason); return parsed;
        }

        private static bool Equal(string left, string right) => string.Equals(left ?? string.Empty, right ?? string.Empty, StringComparison.OrdinalIgnoreCase);

        private static void Reject(IPluginExecutionContext context, string reason) {
            context.OutputParameters["Accepted"] = false; context.OutputParameters["ReasonCode"] = reason;
            throw new InvalidPluginExecutionException(reason);
        }
    }
}
