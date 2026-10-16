"use strict";
const b=require("../lifecycle/newSubmissionStage03Budget"),projection=require("../lifecycle/pipelineFolderProjection");
async function publish(source,manifest,deps){
  const parent=await deps.graph(projection.path(projection.FOLDERS[source.titleId]));
  const stage=await deps.graph(projection.path(parent.parentReference.id));
  if(!parent.folder||!stage.name.startsWith("07")||!parent.webUrl) b.deny("STAGE07_OUTPUT_WORKSPACE_UNBOUND");
  const component=source.sourceSha256.startsWith("701c")?"Primary":source.sourceSha256.startsWith("94b4")?"Continued":"Manuscript";
  const name=`Stage 07 ${component} Review`,target=`${projection.path(parent.id)}:/${encodeURIComponent(name)}`;
  let folder;
  try{folder=await deps.graph(target);}catch(e){if(e.statusCode!==404)throw e;}
  if(!folder){
    try{await deps.graph(`${projection.path(parent.id)}/children`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,folder:{},"@microsoft.graph.conflictBehavior":"fail"})});}catch(e){if(![409,412].includes(e.statusCode))throw e;}
    folder=await deps.graph(target);
  }
  if(!folder.folder||folder.parentReference?.id!==parent.id)b.deny("STAGE07_OUTPUT_WORKSPACE_UNBOUND");
  const safeTitle=source.title.replace(/["*:<>?\/\\|]/g," -").trim();
  const files=[];
  for(const f of manifest.files){
    const bytes=await deps.containerClient.getBlockBlobClient(`${manifest.storagePrefix}/${f.name}`).downloadToBuffer();
    if(b.sha(bytes)!==f.sha256)b.deny("STAGE07_PACKAGE_CUSTODY_CONFLICT");
    const label=f.name.replaceAll("-"," ");
    const filename=`${safeTitle} - ${component} - ${manifest.workingCopy?"WORK IN PROGRESS":"Closure v1"} - ${label}`;
    files.push({name:filename,...await require("../lifecycle/newSubmissionStage02").persistFile({id:folder.id,path:decodeURIComponent(folder.parentReference.path).split("root:")[1]+"/"+folder.name},filename,bytes,
      f.name.endsWith("docx")?"application/vnd.openxmlformats-officedocument.wordprocessingml.document":"application/json",deps)});
  }
  const summary=[source.title,`${component} Stage 07 review`,manifest.workingCopy?"WORK IN PROGRESS. Missing reviews are explicitly identified. This is not a completed edited manuscript.":"Editorial package assembled. Rendering acceptance is recorded separately. No Stage 08 advancement.",
    `Status: ${manifest.status}`,`Original paragraphs: ${manifest.paragraphCount}`,"Current files",...files.map(f=>`${f.name}\n${f.webUrl}`),"Originals and paid receipts are preserved. No author communication has been sent."].join("\n\n");
  const indexName=`${safeTitle} - ${component} - Review Index ${b.sha(summary).slice(0,12)}.txt`;
  const index=await require("../lifecycle/newSubmissionStage02").persistFile({id:folder.id,path:decodeURIComponent(folder.parentReference.path).split("root:")[1]+"/"+folder.name},indexName,Buffer.from(summary),"text/plain; charset=utf-8",deps);
  return{titleFolder:{itemId:parent.id,webUrl:parent.webUrl,name:parent.name},reviewFolder:{itemId:folder.id,webUrl:folder.webUrl},files,index,sourceSha256:source.sourceSha256};
}
module.exports={publish};
