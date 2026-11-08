import { createHash } from 'node:crypto';
import {
  link,
  lstat,
  mkdir,
  mkdtemp,
  open,
  readdir,
  rename,
  rm,
  unlink,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import {
  BoundaryError,
  canonicalRoot,
  confinedPath,
  readBounded,
  readJson,
  relativePath,
} from './files.mjs';

const ID = 'no-mess-left-behind';
const ASSETS = ['main.js', 'manifest.json', 'styles.css'];
const FILES = [...ASSETS, 'SHA256SUMS'];
const RECEIPT = '.nmlb-receipt.json';
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const fail = (code) => {
  throw new BoundaryError(code);
};

function validateManifest(bytes) {
  let manifest;
  try {
    manifest = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    fail('NMLB_MANIFEST');
  }
  if (
    manifest?.id !== ID ||
    typeof manifest.version !== 'string' ||
    !/^\d+\.\d+\.\d+$/.test(manifest.version)
  )
    fail('NMLB_MANIFEST');
  return manifest;
}
async function assets(root) {
  const data = {};
  for (const file of ASSETS)
    data[file] = await readBounded(root, file, file === 'main.js' ? 16_777_216 : 262_144);
  if (!data['main.js'].length) fail('NMLB_EMPTY_PACKAGE');
  validateManifest(data['manifest.json']);
  return data;
}
/** Build a new directory only; never overwrite a prior release or fetch executable code. */
export async function packageBuild(buildDir, outputDir) {
  const data = await assets(buildDir);
  const target = path.join(await canonicalRoot(path.dirname(outputDir)), path.basename(outputDir));
  if (await exists(target)) fail('NMLB_OUTPUT_EXISTS');
  const checksums = `${ASSETS.map((file) => `${digest(data[file])}  ${file}`).join('\n')}\n`;
  const stage = await mkdtemp(path.join(path.dirname(target), '.nmlb-package-'));
  try {
    for (const file of ASSETS)
      await writeFile(path.join(stage, file), data[file], { flag: 'wx', mode: 0o600 });
    await writeFile(path.join(stage, 'SHA256SUMS'), checksums, { flag: 'wx', mode: 0o600 });
    if (await exists(target)) fail('NMLB_OUTPUT_EXISTS');
    await rename(stage, target);
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
  return { status: 'PACKAGED', files: FILES, packageHash: digest(checksums) };
}
async function exists(target) {
  try {
    await lstat(target);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}
async function readPackage(packageDir) {
  const root = await canonicalRoot(packageDir);
  if (!same((await readdir(root)).sort(), [...FILES].sort())) fail('NMLB_PACKAGE_FILES');
  const data = await assets(root);
  const bytes = await readBounded(root, 'SHA256SUMS', 4096);
  const wanted = `${ASSETS.map((file) => `${digest(data[file])}  ${file}`).join('\n')}\n`;
  if (bytes.toString('utf8') !== wanted) fail('NMLB_CHECKSUM');
  data.SHA256SUMS = bytes;
  const hashes = Object.fromEntries(FILES.map((f) => [f, digest(data[f])]));
  return {
    data,
    hashes,
    packageHash: digest(bytes),
    version: validateManifest(data['manifest.json']).version,
  };
}
async function location(vault, configDir) {
  relativePath(configDir);
  const root = await canonicalRoot(vault);
  const config = await confinedPath(root, configDir);
  if (!(await lstat(config)).isDirectory()) fail('NMLB_CONFIG_DIR');
  const enabled = await readJson(root, `${configDir}/community-plugins.json`);
  if (
    enabled.state === 'ERROR' ||
    (enabled.state === 'READ' &&
      (!Array.isArray(enabled.value) || !enabled.value.every((v) => typeof v === 'string')))
  )
    fail('NMLB_CONFIG_JSON');
  if (enabled.state === 'READ' && enabled.value.includes(ID)) fail('NMLB_DISABLE_FIRST');
  const relative = `${configDir}/plugins/${ID}`;
  const target = await confinedPath(root, relative, true);
  return { root, config, target, relative };
}
async function preferences(root) {
  if (!(await exists(path.join(root, 'data.json')))) return null;
  const bytes = await readBounded(root, 'data.json', 1_048_576);
  let value;
  try {
    value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    fail('NMLB_OWNERSHIP');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('NMLB_OWNERSHIP');
  return digest(bytes);
}
async function owned(target) {
  try {
    const root = await canonicalRoot(target);
    const result = await readJson(root, RECEIPT);
    const receipt = result.value;
    if (
      result.state !== 'READ' ||
      !['nmlb-install/1', 'nmlb-install/2'].includes(receipt?.schema) ||
      receipt.id !== ID ||
      !same(Object.keys(receipt.files ?? {}).sort(), [...FILES].sort()) ||
      !Object.values(receipt.files).every((hash) => /^[0-9a-f]{64}$/.test(hash))
    )
      fail('NMLB_OWNERSHIP');
    const state = receipt.schema === 'nmlb-install/1' ? 'INSTALLED' : receipt.state;
    if (!['INSTALLED', 'RETAINED_DATA'].includes(state)) fail('NMLB_OWNERSHIP');
    const keys = ['schema', 'id', 'packageHash', 'files'];
    if (receipt.schema === 'nmlb-install/2') keys.push('state');
    if (!same(Object.keys(receipt).sort(), keys.sort())) fail('NMLB_OWNERSHIP');
    const checksumText = `${ASSETS.map((file) => `${receipt.files[file]}  ${file}`).join('\n')}\n`;
    if (
      receipt.packageHash !== digest(checksumText) ||
      receipt.files.SHA256SUMS !== receipt.packageHash
    )
      fail('NMLB_OWNERSHIP');
    const dataHash = await preferences(root);
    const expected = state === 'INSTALLED' ? [...FILES, RECEIPT] : [RECEIPT];
    if (dataHash !== null) expected.push('data.json');
    if (state === 'RETAINED_DATA' && dataHash === null) fail('NMLB_OWNERSHIP');
    if (!same((await readdir(root)).sort(), expected.sort())) fail('NMLB_OWNERSHIP');
    if (state === 'INSTALLED') {
      for (const file of FILES) {
        if (
          digest(await readBounded(root, file, file === 'main.js' ? 16_777_216 : 262_144)) !==
          receipt.files[file]
        )
          fail('NMLB_OWNERSHIP');
      }
    }
    return { receipt, state, dataHash };
  } catch {
    fail('NMLB_OWNERSHIP');
  }
}
function makePlan(action, loc, configDir, packageHash, snapshot = null) {
  const plan = {
    schema: 'nmlb-install-plan/2',
    action,
    destination: loc.relative,
    vaultHash: digest(loc.root),
    configDir,
    packageHash,
    stateHash: snapshot ? digest(JSON.stringify(snapshot)) : null,
  };
  return { ...plan, planId: digest(JSON.stringify(plan)), activation: 'MANUAL', app: 'NOT_RUN' };
}
export async function planInstall({ vault, packageDir, configDir = '.obsidian' }) {
  const pkg = await readPackage(packageDir);
  const loc = await location(vault, configDir);
  let snapshot = null;
  let action = 'INSTALL';
  if (await exists(loc.target)) {
    try {
      snapshot = await owned(loc.target);
    } catch {
      fail('NMLB_TARGET_EXISTS');
    }
    if (!same(snapshot.receipt.files, pkg.hashes)) fail('NMLB_TARGET_EXISTS');
    action = snapshot.state === 'RETAINED_DATA' ? 'REINSTALL' : 'NOOP';
  }
  return makePlan(action, loc, configDir, pkg.packageHash, snapshot);
}
async function locked(loc, operation) {
  const name = path.join(loc.config, '.nmlb-install.lock');
  let handle;
  try {
    handle = await open(name, 'wx', 0o600);
  } catch {
    fail('NMLB_LOCKED');
  }
  try {
    return await operation();
  } finally {
    await handle.close();
    // An unresolved transition keeps its lock and backup for manual inspection.
    if (!loc.recoveryRequired) await rm(name);
  }
}
function authorize(plan, options) {
  if (!options.appClosed) fail('NMLB_APP_CLOSED');
  if (options.expectedPlan !== plan.planId) fail('NMLB_PLAN');
}
function receiptFor(pkg, state) {
  return {
    schema: 'nmlb-install/2',
    id: ID,
    packageHash: pkg.packageHash,
    files: pkg.hashes,
    state,
  };
}
/** Assets only: data.json never moves or becomes installer-owned.
 * This is not a sandbox against a hostile concurrent filesystem owner. */
async function transition(loc, before, oldFiles, output) {
  const backup = await mkdtemp(path.join(path.dirname(loc.target), '.nmlb-transition-'));
  const stage = path.join(backup, 'new');
  const moved = [];
  const published = [];
  let safeToClean = false;
  try {
    await mkdir(stage);
    for (const [name, bytes] of Object.entries(output))
      await writeFile(path.join(stage, name), bytes, { flag: 'wx', mode: 0o600 });
    if (!same(await owned(loc.target), before)) fail('NMLB_PLAN');
    for (const name of oldFiles) {
      await rename(path.join(loc.target, name), path.join(backup, name));
      moved.push(name);
    }
    if ((await preferences(loc.target)) !== before.dataHash) fail('NMLB_PLAN');
    for (const name of Object.keys(output)) {
      // link is create-only: unlike rename it never replaces a concurrent file.
      await link(path.join(stage, name), path.join(loc.target, name));
      published.push(name);
      await unlink(path.join(stage, name));
    }
    const after = await owned(loc.target);
    if (after.dataHash !== before.dataHash) fail('NMLB_PLAN');
    safeToClean = true;
  } catch (error) {
    let conflict = false;
    for (const name of [...published].reverse()) {
      try {
        const bytes = await readBounded(loc.target, name, 16_777_216);
        if (digest(bytes) !== digest(output[name])) {
          conflict = true;
          continue;
        }
        await unlink(path.join(loc.target, name));
      } catch {
        conflict = true;
      }
    }
    for (const name of moved) {
      try {
        await link(path.join(backup, name), path.join(loc.target, name));
        await unlink(path.join(backup, name));
      } catch {
        conflict = true;
      }
    }
    safeToClean = !conflict;
    if (conflict) {
      loc.recoveryRequired = true;
      fail('NMLB_RECOVERY_REQUIRED');
    }
    throw error;
  } finally {
    if (safeToClean) await rm(backup, { recursive: true });
  }
}
export async function install(options) {
  const plan = await planInstall(options);
  if (!options.apply) return plan;
  authorize(plan, options);
  const configDir = options.configDir ?? '.obsidian';
  const loc = await location(options.vault, configDir);
  return locked(loc, async () => {
    if ((await planInstall(options)).planId !== plan.planId) fail('NMLB_PLAN');
    if (plan.action === 'NOOP') return { status: 'NOOP', planId: plan.planId };
    const pkg = await readPackage(options.packageDir);
    if (pkg.packageHash !== plan.packageHash) fail('NMLB_PLAN');
    const receipt = JSON.stringify(receiptFor(pkg, 'INSTALLED'));
    const output = { ...pkg.data, [RECEIPT]: receipt };
    if (plan.action === 'REINSTALL') {
      const before = await owned(loc.target);
      if (digest(JSON.stringify(before)) !== plan.stateHash) fail('NMLB_PLAN');
      await transition(loc, before, [RECEIPT], output);
    } else {
      const plugins = await confinedPath(loc.root, `${configDir}/plugins`, true);
      await mkdir(plugins, { recursive: true });
      await confinedPath(loc.root, `${configDir}/plugins`);
      const stage = await mkdtemp(path.join(plugins, '.nmlb-install-'));
      try {
        for (const [file, bytes] of Object.entries(output))
          await writeFile(path.join(stage, file), bytes, { flag: 'wx', mode: 0o600 });
        await owned(stage);
        if ((await planInstall(options)).planId !== plan.planId) fail('NMLB_PLAN');
        await rename(stage, loc.target);
        await owned(loc.target);
      } finally {
        await rm(stage, { recursive: true, force: true });
      }
    }
    return { status: 'INSTALLED', planId: plan.planId, activation: 'MANUAL', app: 'NOT_RUN' };
  });
}
export async function planRemove({ vault, configDir = '.obsidian' }) {
  const loc = await location(vault, configDir);
  const snapshot = await owned(loc.target);
  if (snapshot.state !== 'INSTALLED') fail('NMLB_ALREADY_REMOVED');
  return makePlan('REMOVE', loc, configDir, snapshot.receipt.packageHash, snapshot);
}
export async function remove(options) {
  const plan = await planRemove(options);
  if (!options.apply) return plan;
  authorize(plan, options);
  const loc = await location(options.vault, options.configDir ?? '.obsidian');
  return locked(loc, async () => {
    if ((await planRemove(options)).planId !== plan.planId) fail('NMLB_PLAN');
    const before = await owned(loc.target);
    if (digest(JSON.stringify(before)) !== plan.stateHash) fail('NMLB_PLAN');
    if (before.dataHash !== null) {
      const retained = { ...before.receipt, schema: 'nmlb-install/2', state: 'RETAINED_DATA' };
      await transition(loc, before, [...FILES, RECEIPT], { [RECEIPT]: JSON.stringify(retained) });
      return { status: 'REMOVED_WITH_DATA_RETAINED', planId: plan.planId, app: 'NOT_RUN' };
    }
    const quarantine = await mkdtemp(path.join(path.dirname(loc.target), '.nmlb-remove-'));
    const moved = path.join(quarantine, ID);
    await rename(loc.target, moved);
    try {
      // A new preference written after preview must not be deleted by cleanup.
      if (!same(await owned(moved), before)) fail('NMLB_PLAN');
    } catch (error) {
      if (await exists(loc.target)) {
        loc.recoveryRequired = true;
        fail('NMLB_RECOVERY_REQUIRED');
      }
      await rename(moved, loc.target);
      await rm(quarantine, { recursive: true });
      throw error;
    }
    await rm(quarantine, { recursive: true });
    return { status: 'REMOVED', planId: plan.planId, app: 'NOT_RUN' };
  });
}
