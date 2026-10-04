"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

test("separate owner processes recover a registration timeout and replay the durable result without generation or file duplication", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "jm1-revision-restart-"));
  const script = `
    const fs=require('fs'),path=require('path');
    const root=process.argv[2],dir=process.argv[1],step=process.argv[3];
    const {runApprovedRevision}=require(root+'/approvedRevisionRuntime');
    const {policy}=require(root+'/approvedRevisionAuthority');
    const {hash}=require(root+'/approvedRevisionDocument');
    const {binding,evidence}=require(root+'/../../test/fixtures/approvedRevisionSkill');
    const file=n=>path.join(dir,n);
    const readBytes=async n=>fs.existsSync(file(n))?fs.readFileSync(file(n)):null;
    const read=async n=>{const b=await readBytes(n);return b?JSON.parse(b):null};
    const putBytes=async(n,b)=>{if(fs.existsSync(file(n))){if(!fs.readFileSync(file(n)).equals(b))throw Error('immutable conflict')}else fs.writeFileSync(file(n),b,{flag:'wx'})};
    const put=(n,v)=>putBytes(n,Buffer.from(JSON.stringify(v)));
    const store={read,readBytes,put,putBytes,withClaim:async f=>f({assertOwned:async()=>{},state:async v=>fs.writeFileSync(file('state.json'),JSON.stringify(v))})};
    if(step==='recover'){const s=JSON.parse(fs.readFileSync(file('state.json')));s.nextAttemptAt='2020-01-01T00:00:00Z';fs.writeFileSync(file('state.json'),JSON.stringify(s))}
    runApprovedRevision({revisionTaskId:policy.taskId,executionMode:'EXECUTE'},{
      env:{JM1_APPROVED_EDITORIAL_REVISION_ENABLED:'true',JM1_APPROVED_EDITORIAL_REVISION_TASK_ID:policy.taskId},store,client:{},graph:async()=>{throw Error('network forbidden')},
      readAuthority:async()=>({sourceBuffer:Buffer.from('synthetic'),fingerprint:'fixed',snapshot:{editorialAuthority:binding()}}),
      produce:async()=>{fs.appendFileSync(file('generations'),'one\\n');return {review:Buffer.from('review'),clean:Buffer.from('clean'),evidence:evidence()}},
      persistVariant:async(v,b)=>{await putBytes('provider-'+v,b);if(step==='fail')throw Object.assign(Error('registration unavailable'),{status:503});await put('registration-'+v,{sha256:hash(b)});return {variant:v,sha256:hash(b)}},
      verifyReceipt:async r=>{for(const o of r.outputs){if(hash(await readBytes('provider-'+o.variant))!==o.sha256)throw Error('bytes mismatch');if((await read('registration-'+o.variant)).sha256!==o.sha256)throw Error('row mismatch')}}
    }).then(r=>console.log(JSON.stringify({status:r.status,outputs:r.receipt?.outputs}))).catch(e=>{console.error(e);process.exitCode=1});
  `;
  try {
    const execute = (step) => {
      const result = spawnSync(process.execPath, ["-e", script, dir, path.dirname(require.resolve("../src/editorial/approvedRevisionRuntime")), step], { encoding: "utf8", timeout: 60000 });
      assert.equal(result.status, 0, result.stderr); return JSON.parse(result.stdout.trim());
    };
    assert.equal(execute("fail").status, "RETRY_WAIT");
    const recovered = execute("recover");
    assert.equal(recovered.status, "AWAITING_VISUAL_QA");
    const replay = execute("replay");
    assert.equal(replay.status, "IDEMPOTENT"); assert.deepEqual(replay.outputs, recovered.outputs);
    assert.equal(fs.readFileSync(path.join(dir, "generations"), "utf8"), "one\n");
    assert.equal(fs.readdirSync(dir).filter((n) => n.startsWith("provider-")).length, 2);
    assert.equal(fs.readdirSync(dir).filter((n) => n.startsWith("registration-")).length, 2);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
