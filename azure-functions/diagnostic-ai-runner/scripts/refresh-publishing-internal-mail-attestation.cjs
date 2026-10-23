"use strict";
// Administrator-owned readback/renewal. No role, connector, rule or mailbox mutation.
const cp=require("node:child_process"),fs=require("node:fs"),path=require("node:path"),{createHash}=require("node:crypto");
const runtime=path.resolve(__dirname,"..");
const policy=require(runtime+"/src/lifecycle/internalMailAttestation");
const {HISTORY_CONTAINER,publishInternalMailAttestation}=require(runtime+"/src/lifecycle/publishInternalMailAttestation");
const sha=x=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
async function main(){
 const args=process.argv.slice(2),publish=args.includes("--publish"),dest=args.find(x=>x.startsWith("--evidence="))?.slice(11);
 if(args.some(x=>x!=="--publish"&&!x.startsWith("--evidence=")))throw Error("UNSUPPORTED_ARGUMENT");
 if(dest){
  if(!cp.execFileSync("diskutil",["info","/Volumes/UsersExternal"],{encoding:"utf8"}).includes("F68C54EE-52EE-4B3B-B4F0-D64CBEEACE4F")||
    !fs.realpathSync(path.dirname(dest)).startsWith("/Volumes/UsersExternal/Developer/evidence/"))throw Error("EVIDENCE_VOLUME_OR_PATH_INVALID");
 }
 const az=args=>JSON.parse(cp.execFileSync("az",[...args,"-o","json"],{encoding:"utf8",stdio:["ignore","pipe","pipe"]}));
 const account=az(["account","show"]);if(account.tenantId!==policy.identity.tenantId||account.user.type!=="user")throw Error("AUTHORIZED_TENANT_ADMIN_SESSION_REQUIRED");
 const token=az(["account","get-access-token","--resource","https://outlook.office365.com"]).accessToken;
 const requests=[];
 async function read(CmdletName,Parameters={}){
  const response=await fetch(`https://outlook.office365.com/adminapi/beta/${policy.identity.tenantId}/InvokeCommand`,{
   method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
   body:JSON.stringify({CmdletInput:{CmdletName,Parameters}}),signal:AbortSignal.timeout(30000),redirect:"error"});
  const value=await response.json();
  requests.push({command:CmdletName,status:response.status,requestId:response.headers.get("request-id"),at:new Date().toISOString()});
  if(!response.ok||!Array.isArray(value.value)||value["@odata.nextLink"]||value.value.length>=1000)throw Error(`EXCHANGE_READ_FAILED_${CmdletName}_${response.status}`);
  return value.value;
 }
 const select=(rows,keys)=>rows.map(row=>Object.fromEntries(keys.map(key=>[key,row[key]??null])));
 const connectors=select(await read("Get-InboundConnector"),["Identity","Enabled","TreatMessagesAsInternal","CloudServicesMailEnabled"]);
 const rules=select(await read("Get-TransportRule"),["Identity","State","Mode","SetHeaderName","SetHeaderValue","RemoveHeader"]);
 const evidence=value=>({value,recordedAt:new Date().toISOString(),sha256:sha(value)});
 const trust=evidence({status:"TRUST_READ_COMPLETE",connectors,rules});
 const mailboxes=[],rbac=[],applicationAccess=[];
 for(const address of [policy.identity.mailbox,policy.identity.author]){
  mailboxes.push(...select(await read("Get-Mailbox",{Identity:address}),["PrimarySmtpAddress","ExternalDirectoryObjectId","ExchangeGuid","RecipientTypeDetails"]));
  rbac.push({Mailbox:address,Result:select(await read("Test-ServicePrincipalAuthorization",{Identity:"e8c51a80-bdb0-46fa-b398-9109719d6427",Resource:address}),["RoleName","GrantedPermissions","AllowedResourceScope","ScopeType","InScope"])});
  applicationAccess.push(...select(await read("Test-ApplicationAccessPolicy",{Identity:address,AppId:policy.identity.applicationId}),["AppId","MailboxId","AccessCheckResult"]));
 }
 const identities=evidence({status:"IDENTITY_READ_COMPLETE",mailboxes,rbac,applicationAccess});
 const checkedAt=new Date().toISOString(),record={...policy.identity,schemaVersion:1,method:"AUTHORIZED_EXCHANGE_ADMIN_READBACK",checkedAt,
  expiresAt:new Date(Date.parse(trust.recordedAt)+policy.MAX_AGE_MS).toISOString(),evidence:{trust,identities},requests};
 policy.validate(record);
 if(dest)fs.writeFileSync(dest,JSON.stringify(record,null,2),{flag:"wx",mode:0o600});
 if(publish){
  const {BlobServiceClient}=require(runtime+"/node_modules/@azure/storage-blob");
  const {AzureCliCredential}=require(runtime+"/node_modules/@azure/identity");
  const service=new BlobServiceClient("https://stjm1diagrunner.blob.core.windows.net",new AzureCliCredential());
  const activeContainer=service.getContainerClient("jm1-publishing-stage-runtime");
  const historyContainer=service.getContainerClient(HISTORY_CONTAINER);
  if((await activeContainer.getProperties()).blobPublicAccess||(await historyContainer.getProperties()).blobPublicAccess)throw Error("PRIVATE_STORAGE_REQUIRED");
  const result=await publishInternalMailAttestation(record,{historyContainer,activeContainer});
  if((await policy.load(activeContainer)).version!==result.policy.version)throw Error("ATTESTATION_READBACK_CONFLICT");
 }
 console.log(JSON.stringify({status:publish?"FRESH_ADMIN_ATTESTATION_PUBLISHED":"FRESH_ADMIN_ATTESTATION_VALIDATED",checkedAt,expiresAt:record.expiresAt,sha256:sha(record),evidence:dest||null,permissionsChanged:false}));
}
main().catch(e=>{console.error(JSON.stringify({code:e.code||e.message,status:e.statusCode||null}));process.exitCode=1;});
