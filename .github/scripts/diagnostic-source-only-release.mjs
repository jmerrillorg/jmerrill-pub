import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const releaseKeys = Object.freeze(['WEBSITE_RUN_FROM_PACKAGE', 'WEBSITE_RUN_FROM_PACKAGE_BLOB_MI_RESOURCE_ID',
  'JM1_RELEASE_SHA', 'JM1_PRODUCTION_RELEASE_SHA']);
const fail = code => { throw new Error(code); };
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function mapSettings(settings) {
  if (!Array.isArray(settings)) fail('SETTINGS_READ_INVALID');
  const map = new Map();
  for (const row of settings) {
    if (!row || typeof row.name !== 'string' || typeof row.value !== 'string' ||
        typeof row.slotSetting !== 'boolean' || map.has(row.name)) fail('SETTINGS_READ_INVALID');
    map.set(row.name, row);
  }
  return map;
}
export function fingerprint(settings) {
  return digest([...mapSettings(settings).values()].filter(row => !releaseKeys.includes(row.name))
    .sort((a, b) => a.name.localeCompare(b.name)).map(({ name, value, slotSetting }) => ({ name, value, slotSetting })));
}
function packageUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== 'stjm1diagrunner.blob.core.windows.net' ||
      !url.pathname.startsWith('/publishing/deployment-evidence/diagnostic-ai-runner/artifacts/') ||
      !url.pathname.endsWith('.zip') || url.search || url.hash || url.username || url.password) fail('PACKAGE_REFERENCE_DENIED');
  return value;
}
const exactPackage = sha => `https://stjm1diagrunner.blob.core.windows.net/publishing/deployment-evidence/diagnostic-ai-runner/artifacts/diagnostic-ai-runner-${sha}.zip`;
export function snapshot(settings, expectedRelease, health) {
  const map = mapSettings(settings);
  if (!/^[a-f0-9]{40}$/.test(expectedRelease || '') || health?.status !== 'ready' ||
      health.release !== expectedRelease || health.productionRelease !== expectedRelease) fail('LIVE_PREIMAGE_MISMATCH');
  const preimage = {};
  for (const key of releaseKeys) {
    const row = map.get(key);
    if (!row || row.slotSetting) fail('RELEASE_SETTING_PREIMAGE_INVALID');
    preimage[key] = row.value;
  }
  packageUrl(preimage.WEBSITE_RUN_FROM_PACKAGE);
  if (preimage.WEBSITE_RUN_FROM_PACKAGE !== exactPackage(expectedRelease)) fail('PACKAGE_RELEASE_BINDING_MISMATCH');
  if (preimage.WEBSITE_RUN_FROM_PACKAGE_BLOB_MI_RESOURCE_ID !== 'SystemAssigned' ||
      preimage.JM1_RELEASE_SHA !== expectedRelease || preimage.JM1_PRODUCTION_RELEASE_SHA !== expectedRelease) fail('LIVE_PREIMAGE_MISMATCH');
  return { version: 1, previousRelease: expectedRelease, preimage, preservedFingerprint: fingerprint(settings), settingsCount: settings.length };
}
export function assertUnrelated(settings, guard) {
  if (guard?.version !== 1 || fingerprint(settings) !== guard.preservedFingerprint) fail('UNRELATED_SETTINGS_DRIFT');
}
export function assertRelease(settings, expected) {
  const map = mapSettings(settings);
  for (const key of releaseKeys) if (map.get(key)?.value !== expected[key] || map.get(key)?.slotSetting !== false) fail('RELEASE_READBACK_MISMATCH');
}
export async function activate(guard, sourceSha, url, deps) {
  if (!/^[a-f0-9]{40}$/.test(sourceSha || '')) fail('SOURCE_SHA_INVALID');
  if (url !== exactPackage(sourceSha)) fail('PACKAGE_RELEASE_BINDING_MISMATCH');
  const desired = { ...guard.preimage, WEBSITE_RUN_FROM_PACKAGE: packageUrl(url), JM1_RELEASE_SHA: sourceSha, JM1_PRODUCTION_RELEASE_SHA: sourceSha };
  const before = await deps.read();
  assertUnrelated(before, guard);
  assertRelease(before, guard.preimage);
  const health = await deps.health();
  if (health.release !== guard.previousRelease || health.productionRelease !== guard.previousRelease || health.status !== 'ready') fail('LIVE_PREIMAGE_MISMATCH');
  await deps.write(desired);
  const after = await deps.read();
  assertUnrelated(after, guard);
  assertRelease(after, desired);
  return { status: 'SETTINGS_PRESERVED', sourceSha, previousRelease: guard.previousRelease,
    writtenKeys: releaseKeys, preservedFingerprint: guard.preservedFingerprint, settingsCount: after.length };
}
export async function rollback(guard, sourceSha, deps) {
  const current = await deps.read();
  assertUnrelated(current, guard);
  const map = mapSettings(current);
  if (map.get('JM1_RELEASE_SHA')?.value === guard.previousRelease && map.get('JM1_PRODUCTION_RELEASE_SHA')?.value === guard.previousRelease) {
    assertRelease(current, guard.preimage);
    return { status: 'PREIMAGE_ALREADY_ACTIVE' };
  }
  if (!/^[a-f0-9]{40}$/.test(sourceSha || '') || map.get('JM1_RELEASE_SHA')?.value !== sourceSha ||
      map.get('JM1_PRODUCTION_RELEASE_SHA')?.value !== sourceSha || map.get('WEBSITE_RUN_FROM_PACKAGE_BLOB_MI_RESOURCE_ID')?.value !== 'SystemAssigned') fail('ROLLBACK_OWNER_CONFLICT');
  packageUrl(map.get('WEBSITE_RUN_FROM_PACKAGE')?.value);
  if (map.get('WEBSITE_RUN_FROM_PACKAGE')?.value !== exactPackage(sourceSha)) fail('ROLLBACK_OWNER_CONFLICT');
  await deps.write(guard.preimage);
  const after = await deps.read();
  assertUnrelated(after, guard);
  assertRelease(after, guard.preimage);
  return { status: 'PREIMAGE_RESTORED', previousRelease: guard.previousRelease, writtenKeys: releaseKeys };
}

async function main() {
  const env = process.env, action = process.argv[2];
  if (env.GITHUB_EVENT_NAME !== 'workflow_dispatch' || env.GITHUB_REF !== 'refs/heads/main' ||
      env.FUNCTION_APP_NAME !== 'func-jm1-diagnostic-ai-runner' || env.FUNCTION_APP_RESOURCE_GROUP !== 'rg-jm1-ai') fail('SOURCE_ONLY_SCOPE_DENIED');
  const az = args => {
    try { return execFileSync('az', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 120000, stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch { fail('AZURE_OPERATION_FAILED_READ_STATE_BEFORE_RECOVERY'); }
  };
  const target = ['--name', env.FUNCTION_APP_NAME, '--resource-group', env.FUNCTION_APP_RESOURCE_GROUP];
  const deps = {
    read: async () => JSON.parse(az(['functionapp', 'config', 'appsettings', 'list', ...target, '--output', 'json'])),
    write: async values => { az(['functionapp', 'config', 'appsettings', 'set', ...target, '--settings',
      ...releaseKeys.map(key => `${key}=${values[key]}`), '--output', 'none']); },
    health: async () => {
      const response = await fetch(`https://${env.FUNCTION_APP_NAME}.azurewebsites.net/api/health`, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) fail('HEALTH_READ_FAILED');
      return response.json();
    }
  };
  const guardPath = `${env.RUNNER_TEMP}/diagnostic-source-only-preimage.json`;
  let receipt;
  if (action === 'preflight') {
    const guard = snapshot(await deps.read(), env.EXPECTED_PREVIOUS_RELEASE, await deps.health());
    writeFileSync(guardPath, JSON.stringify(guard), { mode: 0o600, flag: 'wx' });
    receipt = { status: 'PREFLIGHT_PASS', previousRelease: guard.previousRelease, settingsCount: guard.settingsCount,
      preservedFingerprint: guard.preservedFingerprint, writtenKeys: [] };
  } else {
    const guard = JSON.parse(readFileSync(guardPath, 'utf8'));
    if (action === 'activate') receipt = await activate(guard, env.GITHUB_SHA,
      `https://stjm1diagrunner.blob.core.windows.net/publishing/${env.JM1_PACKAGE_BLOB_NAME}`, deps);
    else if (action === 'rollback') receipt = await rollback(guard, env.GITHUB_SHA, deps);
    else if (action === 'verify') {
      const settings = await deps.read();
      assertUnrelated(settings, guard);
      assertRelease(settings, { ...guard.preimage, WEBSITE_RUN_FROM_PACKAGE: packageUrl(`https://stjm1diagrunner.blob.core.windows.net/publishing/${env.JM1_PACKAGE_BLOB_NAME}`),
        JM1_RELEASE_SHA: env.GITHUB_SHA, JM1_PRODUCTION_RELEASE_SHA: env.GITHUB_SHA });
      receipt = { status: 'FINAL_SETTINGS_PRESERVED', sourceSha: env.GITHUB_SHA, preservedFingerprint: guard.preservedFingerprint };
    } else fail('ACTION_DENIED');
    if (action === 'activate' || action === 'rollback') {
      az(['functionapp', 'restart', ...target, '--output', 'none']);
      try { az(['functionapp', 'sync-function-triggers', ...target, '--output', 'none']); }
      catch { /* Management-plane catalog can lag; existing live probes remain required. */ }
      if (action === 'rollback') {
        let good = false;
        for (let i = 0; i < 12; i++) {
          try { const h = await deps.health(); good = h.status === 'ready' && h.release === guard.previousRelease && h.productionRelease === guard.previousRelease; } catch { /* Retry bounded propagation only. */ }
          if (good) break;
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
        if (!good) fail('ROLLBACK_HEALTH_UNPROVEN');
      }
    }
  }
  writeFileSync(`${env.RUNNER_TEMP}/diagnostic-source-only-${action}.json`, JSON.stringify(receipt), { mode: 0o600 });
  console.log(JSON.stringify(receipt));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(/^[A-Z0-9_]+$/.test(error.message) ? error.message : 'SOURCE_ONLY_RELEASE_FAILED'); process.exitCode = 1; });
}
