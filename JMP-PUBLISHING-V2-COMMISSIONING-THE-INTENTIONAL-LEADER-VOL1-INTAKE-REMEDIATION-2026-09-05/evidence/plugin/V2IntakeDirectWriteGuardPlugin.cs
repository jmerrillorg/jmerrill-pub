using Microsoft.Xrm.Sdk;
using System;
using System.Linq;

namespace plugin
{
    public class V2IntakeDirectWriteGuardPlugin : PluginBase
    {
        private static readonly string[] DerivedFields = {
            "jmpv2_completenessstatus", "jmpv2_completenessreasons", "jmpv2_submittedat"
        };

        public V2IntakeDirectWriteGuardPlugin(string unsecureConfiguration, string secureConfiguration)
            : base(typeof(V2IntakeDirectWriteGuardPlugin)) { }

        protected override void ExecuteDataversePlugin(ILocalPluginContext localPluginContext)
        {
            var context = localPluginContext.PluginExecutionContext;
            var authorizedParent = context.Depth > 1 ||
                (context.SharedVariables.Contains("JMPV2_INTAKE_AUTHORITY") &&
                 !string.IsNullOrWhiteSpace(Convert.ToString(context.SharedVariables["JMPV2_INTAKE_AUTHORITY"])));
            if (authorizedParent) return;

            if (context.PrimaryEntityName == "jmpv2_intakeresponse")
                throw new InvalidPluginExecutionException("DIRECT_INTAKE_RESPONSE_WRITE_DENIED");

            if (context.PrimaryEntityName == "jmpv2_intakesubmission" && context.InputParameters.Contains("Target")) {
                var target = context.InputParameters["Target"] as Entity;
                if (target != null && target.Attributes.Keys.Any(key => DerivedFields.Contains(key)))
                    throw new InvalidPluginExecutionException("DIRECT_INTAKE_COMPLETENESS_WRITE_DENIED");
            }
        }
    }
}
