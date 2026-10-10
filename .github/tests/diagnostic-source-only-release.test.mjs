import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { activate, rollback, snapshot, fingerprint, releaseKeys } from '../scripts/diagnostic-source-only-release.mjs';

const old = '1fd74fafb719fc00d52956bc50e94fb1589613ca', next = 'fcb8e6c770ba9bb47e363635623d756eb29e02a5';
const url = sha => `https://stjm1diagrunner.blob.core.windows.net/publishing/deployment-evidence/diagnostic-ai-runner/artifacts/diagnostic-ai-runner-${sha}.zip`;
const health = { status: 'ready', release: old, productionRelease: old };
const fixture = () => Object.entries({ WEBSITE_RUN_FROM_PACKAGE: url(old), WEBSITE_RUN_FROM_PACKAGE_BLOB_MI_RESOURCE_ID: 'SystemAssigned',
  JM1_RELEASE_SHA: old, JM1_PRODUCTION_RELEASE_SHA: old, JM1_PUBLISHING_STAGE_RUNTIME_ENABLED: 'false',
  JM1_PAYMENT_ELECTION_COMMUNICATION_ENABLED: 'false', JM1_STRIPE_CONNECT_REMINDER_SYSTEM_ENABLED: 'false',
  PRIVATE_SECRET: 'synthetic-secret-not-for-audit' }).map(([name, value]) => ({ name, value, slotSetting: false }));
function runtime(initial = fixture()) {
  let rows = structuredClone(initial), writes = [];
  return { read: async () => structuredClone(rows), health: async () => health,
    write: async values => { writes.push(values); for (const [name, value] of Object.entries(values)) {
      const row = rows.find(x => x.name === name); if (!row) throw Error('unexpected key'); row.value = value;
    } }, writes, change: action => action(rows) };
}
test('preimage records only four release values, not secret or business values', () => {
  const guard = snapshot(fixture(), old, health);
  assert.deepEqual(Object.keys(guard.preimage), releaseKeys);
  assert.doesNotMatch(JSON.stringify(guard), /synthetic-secret|PRIVATE_SECRET|PAYMENT_ELECTION/);
  assert.equal(guard.preservedFingerprint, fingerprint(fixture().reverse()));
});
test('source-only activation writes exactly four keys and preserves missing/disabled controls', async () => {
  const deps = runtime(), guard = snapshot(await deps.read(), old, health);
  const receipt = await activate(guard, next, url(next), deps);
  assert.deepEqual(Object.keys(deps.writes[0]), releaseKeys);
  const rows = await deps.read();
  assert.equal(rows.find(x => x.name === 'JM1_PAYMENT_ELECTION_COMMUNICATION_ENABLED').value, 'false');
  assert.equal(rows.find(x => x.name === 'JM1_STRIPE_CONNECT_REMINDER_SYSTEM_ENABLED').value, 'false');
  assert.equal(rows.some(x => x.name === 'JM1_TITLE_COMMISSIONING_FRESH_ENABLED'), false);
  assert.equal(receipt.status, 'SETTINGS_PRESERVED');
  assert.equal(fingerprint(rows), guard.preservedFingerprint);
});
test('concurrent unrelated, absent-setting and slot-flag drift reject before write', async () => {
  for (const change of [rows => { rows[4].value = 'true'; }, rows => { rows[4].slotSetting = true; },
    rows => rows.push({ name: 'NEW_SETTING', value: 'true', slotSetting: false })]) {
    const deps = runtime(), guard = snapshot(await deps.read(), old, health); deps.change(change);
    await assert.rejects(activate(guard, next, url(next), deps), /UNRELATED_SETTINGS_DRIFT/);
    assert.equal(deps.writes.length, 0);
  }
});
test('wrong baseline, identity, package or duplicate settings fail closed', () => {
  assert.throws(() => snapshot(fixture(), next, health), /LIVE_PREIMAGE_MISMATCH/);
  for (const [key, value] of [['WEBSITE_RUN_FROM_PACKAGE_BLOB_MI_RESOURCE_ID', 'another-identity'],
    ['WEBSITE_RUN_FROM_PACKAGE', `${url(old)}?sig=secret`], ['JM1_PRODUCTION_RELEASE_SHA', next]]) {
    const rows = fixture(); rows.find(x => x.name === key).value = value;
    assert.throws(() => snapshot(rows, old, health));
  }
  assert.throws(() => snapshot([...fixture(), fixture()[0]], old, health), /SETTINGS_READ_INVALID/);
});
test('a changed live release rejects after preimage and before any write', async () => {
  const deps = runtime(), guard = snapshot(await deps.read(), old, health);
  deps.health = async () => ({ ...health, release: next });
  await assert.rejects(activate(guard, next, url(next), deps), /LIVE_PREIMAGE_MISMATCH/);
  assert.equal(deps.writes.length, 0);
});
test('another artifact cannot borrow the reviewed SHA', async () => {
  const deps = runtime(), guard = snapshot(await deps.read(), old, health);
  await assert.rejects(activate(guard, next, url(old), deps), /PACKAGE_RELEASE_BINDING_MISMATCH/);
  assert.equal(deps.writes.length, 0);
  await activate(guard, next, url(next), deps);
  deps.change(rows => { rows.find(x => x.name === 'WEBSITE_RUN_FROM_PACKAGE').value = url('a'.repeat(40)); });
  await assert.rejects(rollback(guard, next, deps), /ROLLBACK_OWNER_CONFLICT/);
  assert.equal(deps.writes.length, 1);
});
test('post-write unrelated drift reports failure and never restores competing settings', async () => {
  const deps = runtime(), guard = snapshot(await deps.read(), old, health), write = deps.write;
  deps.write = async values => { await write(values); deps.change(rows => { rows[4].value = 'true'; }); };
  await assert.rejects(activate(guard, next, url(next), deps), /UNRELATED_SETTINGS_DRIFT/);
  await assert.rejects(rollback(guard, next, deps), /UNRELATED_SETTINGS_DRIFT/);
  assert.equal(deps.writes.length, 1);
});
test('ambiguous applied write is read back then recovered to exact preimage', async () => {
  const deps = runtime(), guard = snapshot(await deps.read(), old, health), write = deps.write;
  deps.write = async values => { await write(values); throw Error('ambiguous timeout'); };
  await assert.rejects(activate(guard, next, url(next), deps), /ambiguous timeout/);
  deps.write = write;
  assert.equal((await rollback(guard, next, deps)).status, 'PREIMAGE_RESTORED');
  assert.deepEqual(await deps.read(), fixture());
  assert.equal((await rollback(guard, next, deps)).status, 'PREIMAGE_ALREADY_ACTIVE');
  assert.equal(deps.writes.length, 2);
});
test('competing release and partial release markers block rollback', async () => {
  for (const release of ['a'.repeat(40), old]) {
    const deps = runtime(), guard = snapshot(await deps.read(), old, health);
    await activate(guard, next, url(next), deps);
    deps.change(rows => { rows.find(x => x.name === 'JM1_RELEASE_SHA').value = release; });
    await assert.rejects(rollback(guard, next, deps), /ROLLBACK_OWNER_CONFLICT/);
    assert.equal(deps.writes.length, 1);
  }
});
test('workflow source-only mode is manual, main-scoped and isolated from standard business writes', () => {
  const workflow = readFileSync(new URL('../workflows/diagnostic-ai-runner.yml', import.meta.url), 'utf8');
  assert.match(workflow, /RELEASE_MODE:.*github.event_name == 'workflow_dispatch'.*inputs.release_mode.*'standard'/);
  assert.match(workflow, /name: Activate immutable Function App package\n\s+if: env.RELEASE_MODE == 'standard'/);
  assert.match(workflow, /name: Activate source-only package without business settings\n\s+if: env.RELEASE_MODE == 'source-only'/);
  assert.match(workflow, /if: failure\(\) && env.RELEASE_MODE == 'source-only'/);
  assert.match(workflow, /diagnostic-source-only-release.mjs verify/);
  const script = readFileSync(new URL('../scripts/diagnostic-source-only-release.mjs', import.meta.url), 'utf8');
  assert.match(script, /GITHUB_REF !== 'refs\/heads\/main'/);
  assert.match(script, /releaseKeys.map\(key =>/);
  assert.doesNotMatch(script, /JM1_PAYMENT_ELECTION_COMMUNICATION_ENABLED|JM1_STRIPE_CONNECT_REMINDER_SYSTEM_ENABLED/);
});
