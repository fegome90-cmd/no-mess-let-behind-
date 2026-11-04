import { createHash } from 'node:crypto';
import { lstat, mkdir, mkdtemp, open, readdir, rename, rm, writeFile } from 'node:fs/promises';
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
async function owned(target) {
  try {
    const root = await canonicalRoot(target);
    if (!same((await readdir(root)).sort(), [...FILES, RECEIPT].sort())) fail('NMLB_OWNERSHIP');
    const receipt = await readJson(root, RECEIPT);
    if (
      receipt.state !== 'READ' ||
      receipt.value?.schema !== 'nmlb-install/1' ||
      receipt.value.id !== ID ||
      !same(Object.keys(receipt.value.files ?? {}).sort(), [...FILES].sort())
    )
      fail('NMLB_OWNERSHIP');
    for (const file of FILES) {
      if (
        digest(await readBounded(root, file, file === 'main.js' ? 16_777_216 : 262_144)) !==
        receipt.value.files[file]
      )
        fail('NMLB_OWNERSHIP');
    }
    return receipt.value;
  } catch {
    fail('NMLB_OWNERSHIP');
  }
}
function makePlan(action, loc, configDir, packageHash) {
  const plan = {
    schema: 'nmlb-install-plan/1',
    action,
    destination: loc.relative,
    vaultHash: digest(loc.root),
    configDir,
    packageHash,
  };
  return { ...plan, planId: digest(JSON.stringify(plan)), activation: 'MANUAL', app: 'NOT_RUN' };
}
export async function planInstall({ vault, packageDir, configDir = '.obsidian' }) {
  const pkg = await readPackage(packageDir);
  const loc = await location(vault, configDir);
  let action = 'INSTALL';
  if (await exists(loc.target)) {
    let receipt;
    try {
      receipt = await owned(loc.target);
    } catch {
      fail('NMLB_TARGET_EXISTS');
    }
    if (!same(receipt.files, pkg.hashes)) fail('NMLB_TARGET_EXISTS');
    action = 'NOOP';
  }
  return makePlan(action, loc, configDir, pkg.packageHash);
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
    await rm(name);
  }
}
function authorize(plan, options) {
  if (!options.appClosed) fail('NMLB_APP_CLOSED');
  if (options.expectedPlan !== plan.planId) fail('NMLB_PLAN');
}
export async function install(options) {
  const plan = await planInstall(options);
  if (!options.apply) return plan;
  authorize(plan, options);
  if (plan.action === 'NOOP') return { status: 'NOOP', planId: plan.planId };
  const configDir = options.configDir ?? '.obsidian';
  const loc = await location(options.vault, configDir);
  return locked(loc, async () => {
    if ((await planInstall(options)).planId !== plan.planId) fail('NMLB_PLAN');
    const pkg = await readPackage(options.packageDir);
    const plugins = await confinedPath(loc.root, `${configDir}/plugins`, true);
    await mkdir(plugins, { recursive: true });
    await confinedPath(loc.root, `${configDir}/plugins`);
    const stage = await mkdtemp(path.join(plugins, '.nmlb-install-'));
    try {
      for (const file of FILES)
        await writeFile(path.join(stage, file), pkg.data[file], { flag: 'wx', mode: 0o600 });
      await writeFile(
        path.join(stage, RECEIPT),
        JSON.stringify({
          schema: 'nmlb-install/1',
          id: ID,
          packageHash: pkg.packageHash,
          files: pkg.hashes,
        }),
        { flag: 'wx', mode: 0o600 },
      );
      await owned(stage);
      if ((await planInstall(options)).planId !== plan.planId) fail('NMLB_PLAN');
      await rename(stage, loc.target);
      await owned(loc.target);
      return { status: 'INSTALLED', planId: plan.planId, activation: 'MANUAL', app: 'NOT_RUN' };
    } finally {
      await rm(stage, { recursive: true, force: true });
    }
  });
}
export async function planRemove({ vault, configDir = '.obsidian' }) {
  const loc = await location(vault, configDir);
  const receipt = await owned(loc.target);
  return makePlan('REMOVE', loc, configDir, digest(JSON.stringify(receipt)));
}
export async function remove(options) {
  const plan = await planRemove(options);
  if (!options.apply) return plan;
  authorize(plan, options);
  const loc = await location(options.vault, options.configDir ?? '.obsidian');
  return locked(loc, async () => {
    if ((await planRemove(options)).planId !== plan.planId) fail('NMLB_PLAN');
    const quarantine = await mkdtemp(path.join(path.dirname(loc.target), '.nmlb-remove-'));
    const moved = path.join(quarantine, ID);
    await rename(loc.target, moved);
    try {
      await owned(moved);
    } catch (error) {
      await rename(moved, loc.target);
      await rm(quarantine, { recursive: true });
      throw error;
    }
    await rm(quarantine, { recursive: true });
    return { status: 'REMOVED', planId: plan.planId, app: 'NOT_RUN' };
  });
}
