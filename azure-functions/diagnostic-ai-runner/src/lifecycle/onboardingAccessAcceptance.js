"use strict";
const fixture = require("./onboardingAccessFixture");
const { WEBSITE, PROCESSOR, configuration, payloadFor, validatePayload, submissionId, hash } = fixture;
async function handler(body, supplied = {}) {
  if (body?.mode !== "ONBOARDING_ACCESS_ACCEPT" || Object.keys(body).some(k => k !== "mode")) return { status:400, jsonBody:{code:"ONBOARDING_ACCEPTANCE_SCOPE_DENIED"} };
  try {
    const env = supplied.env || process.env, { key } = configuration(env), id = submissionId(key);
    const deps = await require("./newSubmissionStage01").native(supplied);
    const who = await deps.request("WhoAmI()");
    if (who.UserId !== PROCESSOR || who.OrganizationId !== "9dafb403-b493-f011-a700-000d3a106f37") throw Error("ONBOARDING_ACCEPTANCE_IDENTITY_CONFLICT");
    const row = await deps.request(`jm1pub_submissions(${id})?$select=jm1pub_submissionid,_ownerid_value,_createdby_value,_jm1pub_linkedcontact_value,jm1pub_formtype,jm1pub_rawpayload,jm1pub_rightsholderconfirmed`);
    if (row.jm1pub_submissionid !== id || row._ownerid_value !== WEBSITE || row._createdby_value !== WEBSITE ||
      row._jm1pub_linkedcontact_value || row.jm1pub_formtype !== "onboarding-access-synthetic" || row.jm1pub_rightsholderconfirmed !== false ||
      !row["@odata.etag"] || !validatePayload(require("./onboardingPayloadCodec").decode(row.jm1pub_rawpayload),env)) throw Error("ONBOARDING_ACCEPTANCE_RECORD_CONFLICT");
    const rights = await deps.request(`systemusers(${PROCESSOR})/Microsoft.Dynamics.CRM.RetrievePrincipalAccess(Target=@p1)?` + new URLSearchParams({"@p1":JSON.stringify({"@odata.id":`jm1pub_submissions(${id})`})}));
    if (rights.AccessRights !== "ReadAccess") throw Error("ONBOARDING_ACCEPTANCE_RIGHTS_CONFLICT");
    if ((await deps.containerClient.getProperties()).blobPublicAccess) throw Error("ONBOARDING_ACCEPTANCE_STORAGE_PUBLIC");
    const b = require("./newSubmissionStage03Budget"), reference = `onboarding-access-acceptance/${key}/receipt.json`;
    const result = { schemaVersion:1, synthetic:true, status:"ACCESS_BOUNDARY_ACCEPTED", submissionId:id,
      payloadSha256:hash(payloadFor(key)), etag:row["@odata.etag"], rights:rights.AccessRights, runtimeUserId:who.UserId,
      reference, stageCompletion:false, titleChanges:0, communications:0, payments:0, modelCalls:0 };
    const prior = await b.optional(deps.containerClient,reference);
    if (prior && JSON.stringify(prior.value)!==JSON.stringify(result)) throw Error("ONBOARDING_ACCEPTANCE_RECEIPT_CONFLICT");
    await b.immutable(deps.containerClient,reference,result);
    return { status:200,jsonBody:{...result,replay:Boolean(prior)} };
  } catch(e) { return {status:409,jsonBody:{code:/^ONBOARDING_ACCEPTANCE_[A-Z_]+$/.test(e.message)?e.message:"ONBOARDING_ACCEPTANCE_DEPENDENCY_FAILED",providerStatus:e.statusCode||null,stageCompletion:false}}; }
}
module.exports = { ...fixture, handler };
