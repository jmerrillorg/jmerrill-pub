import {test} from 'node:test'
import assert from 'node:assert/strict'
import {canonicalRolePrivilegePairs} from './fresh-title-role-policy.mjs'
const id='7398c78c-29a5-4982-9ada-73390f64fe99'
test('native automatic row IDs and etags do not change privilege identity/depth parity',()=>{
 assert.deepEqual(canonicalRolePrivilegePairs([{privilegeid:id,privilegedepthmask:2,roleprivilegeid:'different-row', '@odata.etag':'W/"1"'}]),[{privilegeid:id,privilegedepthmask:2}])
})
test('depth differences remain observable',()=>{
 assert.notDeepEqual(canonicalRolePrivilegePairs([{privilegeid:id,privilegedepthmask:2}]),canonicalRolePrivilegePairs([{privilegeid:id,privilegedepthmask:8}]))
})
test('invalid and duplicate native privilege pairs reject',()=>{
 assert.throws(()=>canonicalRolePrivilegePairs([{privilegeid:id,privilegedepthmask:3}]),/INVALID_ROLE_PRIVILEGE_PAIR/)
 assert.throws(()=>canonicalRolePrivilegePairs([{privilegeid:id,privilegedepthmask:2},{privilegeid:id.toUpperCase(),privilegedepthmask:2}]),/INVALID_ROLE_PRIVILEGE_PAIR/)
})
