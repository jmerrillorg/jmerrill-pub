"use strict";
const policy=require("../../config/stage07-approved-corrections.json");
const {createHash}=require("node:crypto");
const sha=x=>createHash("sha256").update(x).digest("hex");
const deny=()=>{throw Object.assign(Error("STAGE07_CORRECTION_SOURCE_CONFLICT"),{safeCode:"STAGE07_CORRECTION_SOURCE_CONFLICT"});};
function apply(source,original,proposed) {
  const rule=policy.components.find(x=>x.sourceSha256===source.sourceSha256);
  if(!rule||original.length!==rule.paragraphCount||proposed.length!==original.length)deny();
  if(source.sourceSha256.startsWith("d4fd")) {
    if(JSON.stringify(original.slice(12366,12982))!==JSON.stringify(original.slice(12986,13602)))deny();
  }
  if(source.sourceSha256.startsWith("94b4")) {
    if(JSON.stringify(original.slice(1310,1349))!==JSON.stringify(original.slice(1351,1390))||
       !original[1390].startsWith(original[1349])||original[1961]!=="Then")deny();
  }
  const output=structuredClone(proposed),changes=[];
  for(const a of rule.actions){
    if(sha(original[a.index])!==a.sourceParagraphSha256||output[a.index].index!==a.index)deny();
    const before=output[a.index].text;
    const after=a.action==="RESTORE_SOURCE"?original[a.index]:a.action==="REMOVE_REVIEW_PREFIX"?original[a.index].slice("Batch Review Notes".length).trim():"";
    output[a.index].text=after;
    changes.push({...a,sourceText:original[a.index],previousProposedText:before,readerText:after});
  }
  return{proposed:output,rule,record:{authority:policy.reference,sourceSha256:source.sourceSha256,changes,
    originalsPreserved:true,providerReceiptsPreserved:true,paidCalls:0,stage08:"NOT_STARTED"}};
}
function findings(tasks,results,rule){
  const resolved=[],unresolved=[];
  for(const t of tasks.filter(t=>t.pass==="CONSISTENCY_SECTION"||t.pass==="FINAL_SYNTHESIS")){
    for(const text of recoverLedger(results.get(t.id).output).blockingFindings||[]){
      const decision=rule.resolvedFindings.find(x=>x.taskId===t.id&&x.findingSha256===sha(text));
      (decision?resolved:unresolved).push({taskId:t.id,text,...(decision?{resolution:decision.resolution}:{})});
    }
  }
  return{resolved,unresolved};
}
function recoverLedger(output){
  if(typeof output.ledger!=="string")return output;
  const match=output.ledger.match(/^(.*)<\/ledger>\s*<parameter name="questions">([\s\S]*?)<\/parameter>\s*<parameter name="blockingFindings">([\s\S]*?)<\/parameter>\s*$/s);
  if(!match)return output;
  const questions=JSON.parse(match[2]),blockingFindings=JSON.parse(match[3]);
  if(!Array.isArray(questions)||!Array.isArray(blockingFindings)||[...questions,...blockingFindings].some(x=>typeof x!=="string"))deny();
  return{...output,ledger:match[1],questions:[...new Set([...(output.questions||[]),...questions])],blockingFindings:[...new Set([...(output.blockingFindings||[]),...blockingFindings])],fieldRecovery:{method:"EXACT_EMBEDDED_LEDGER_FIELDS_V1",originalOutputSha256:sha(JSON.stringify(output))}};
}
module.exports={apply,findings,recoverLedger};
