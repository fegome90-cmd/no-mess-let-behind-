import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, mkdir, readdir, readFile, rm, symlink } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import {
  install,
  packageBuild,
  planInstall,
  planRemove,
  remove,
} from '../../tools/lib/install.mjs';
import { fixture, put } from './helpers.mjs';

const id = 'no-mess-left-behind';
async function setup(t) {
  const root = await fixture(t);
  const build = path.join(root, 'build');
  await mkdir(build);
  await put(build, 'main.js', '/* SYNTHETIC PACKAGE: never executed */\n');
  await put(
    build,
    'manifest.json',
    JSON.stringify({ id, version: '0.1.0', minAppVersion: '1.8.7', isDesktopOnly: true }),
  );
  await put(build, 'styles.css', '/* fixture */\n');
  const pkg = path.join(root, 'package');
  await packageBuild(build, pkg);
  const vault = path.join(root, 'vault');
  await mkdir(vault);
  await put(vault, '.obsidian/community-plugins.json', '["another-plugin"]');
  await put(vault, 'note.md', '# DO NOT CHANGE\n');
  return { root, build, packageDir: pkg, vault };
}
test('packaging creates checksums for exactly three plugin assets', async (t) => {
  const s = await setup(t);
  const names = await readdir(s.packageDir);
  assert.deepEqual(names.sort(), ['SHA256SUMS', 'main.js', 'manifest.json', 'styles.css']);
  const hashes = await readFile(path.join(s.packageDir, 'SHA256SUMS'), 'utf8');
  for (const line of hashes.trim().split('\n')) {
    const [digest, file] = line.split(/\s+/);
    assert.equal(
      createHash('sha256')
        .update(await readFile(path.join(s.packageDir, file)))
        .digest('hex'),
      digest,
    );
  }
});
test('dry-run creates nothing in the vault and binds plan to target/package', async (t) => {
  const s = await setup(t);
  const plan = await planInstall(s);
  assert.equal(plan.action, 'INSTALL');
  assert.match(plan.planId, /^[0-9a-f]{64}$/);
  await assert.rejects(access(path.join(s.vault, '.obsidian/plugins')));
  assert.equal((await install(s)).planId, plan.planId);
  assert.equal(await readFile(path.join(s.vault, 'note.md'), 'utf8'), '# DO NOT CHANGE\n');
});
test('apply requires exact reviewed plan and app-closed acknowledgement', async (t) => {
  const s = await setup(t);
  const plan = await planInstall(s);
  await assert.rejects(
    install({ ...s, apply: true, expectedPlan: 'wrong', appClosed: true }),
    /NMLB_PLAN/,
  );
  await assert.rejects(
    install({ ...s, apply: true, expectedPlan: plan.planId }),
    /NMLB_APP_CLOSED/,
  );
});
test('install/readback/noop/remove roundtrip preserves notes and plugin activation', async (t) => {
  const s = await setup(t);
  const plan = await planInstall(s);
  assert.equal(
    (await install({ ...s, apply: true, appClosed: true, expectedPlan: plan.planId })).status,
    'INSTALLED',
  );
  assert.equal((await planInstall(s)).action, 'NOOP');
  const removal = await planRemove(s);
  assert.equal(
    (await remove({ ...s, apply: true, appClosed: true, expectedPlan: removal.planId })).status,
    'REMOVED',
  );
  await assert.rejects(access(path.join(s.vault, '.obsidian/plugins', id)));
  assert.equal(
    await readFile(path.join(s.vault, '.obsidian/community-plugins.json'), 'utf8'),
    '["another-plugin"]',
  );
  assert.equal(await readFile(path.join(s.vault, 'note.md'), 'utf8'), '# DO NOT CHANGE\n');
});
test('package tampering or malformed checksum blocks before writes', async (t) => {
  const s = await setup(t);
  const plan = await planInstall(s);
  await put(s.packageDir, 'main.js', 'TAMPERED');
  await assert.rejects(
    install({ ...s, apply: true, appClosed: true, expectedPlan: plan.planId }),
    /NMLB_CHECKSUM/,
  );
  await assert.rejects(access(path.join(s.vault, '.obsidian/plugins')));
});
test('unknown target and unrelated extra files are never overwritten/removed', async (t) => {
  const s = await setup(t);
  await put(s.vault, `.obsidian/plugins/${id}/user.txt`, 'KEEP');
  await assert.rejects(planInstall(s), /NMLB_TARGET_EXISTS/);
  await assert.rejects(planRemove(s), /NMLB_OWNERSHIP/);
});
test('modified installed assets and extra user settings block removal', async (t) => {
  const s = await setup(t);
  const plan = await planInstall(s);
  await install({ ...s, apply: true, appClosed: true, expectedPlan: plan.planId });
  await put(s.vault, `.obsidian/plugins/${id}/data.json`, '{"user":"settings"}');
  await assert.rejects(planRemove(s), /NMLB_OWNERSHIP/);
});
test('active plugin must be disabled before file installation/removal', async (t) => {
  const s = await setup(t);
  await put(s.vault, '.obsidian/community-plugins.json', JSON.stringify([id]));
  await assert.rejects(planInstall(s), /NMLB_DISABLE_FIRST/);
});
test('symlink in destination or package assets cannot escape', async (t) => {
  const s = await setup(t);
  const external = await fixture(t);
  await symlink(external, path.join(s.vault, '.obsidian/plugins'));
  await assert.rejects(planInstall(s), /NMLB_SYMLINK/);
  assert.deepEqual(await readdir(external), []);
});
test('concurrent installers do not produce partial or duplicate targets', async (t) => {
  const s = await setup(t);
  const plan = await planInstall(s);
  const outcomes = await Promise.allSettled(
    [1, 2].map(() => install({ ...s, apply: true, appClosed: true, expectedPlan: plan.planId })),
  );
  assert(outcomes.some((r) => r.status === 'fulfilled'));
  assert.equal((await planInstall(s)).action, 'NOOP');
  assert.equal(
    (await readdir(path.join(s.vault, '.obsidian'))).filter((x) => x.includes('lock')).length,
    0,
  );
});
test('custom config directory is explicit, not silently assumed', async (t) => {
  const s = await setup(t);
  await put(s.vault, '.custom/community-plugins.json', '[]');
  const options = { ...s, configDir: '.custom' };
  const plan = await planInstall(options);
  await install({ ...options, apply: true, appClosed: true, expectedPlan: plan.planId });
  await access(path.join(s.vault, '.custom/plugins', id, 'main.js'));
  await assert.rejects(access(path.join(s.vault, '.obsidian/plugins', id)));
});

test('modified installed main.js is preserved and blocks removal', async (t) => {
  const s = await setup(t);
  const plan = await planInstall(s);
  await install({ ...s, apply: true, appClosed: true, expectedPlan: plan.planId });
  const target = `.obsidian/plugins/${id}/main.js`;
  await put(s.vault, target, 'USER MODIFICATION');
  await assert.rejects(planRemove(s), /NMLB_OWNERSHIP/);
  assert.equal(await readFile(path.join(s.vault, target), 'utf8'), 'USER MODIFICATION');
});
test('symlink package asset is rejected before creating the target', async (t) => {
  const s = await setup(t);
  await rm(path.join(s.packageDir, 'main.js'));
  await symlink(path.join(s.build, 'main.js'), path.join(s.packageDir, 'main.js'));
  await assert.rejects(planInstall(s), /NMLB_SYMLINK/);
  await assert.rejects(access(path.join(s.vault, '.obsidian/plugins')));
});
test('packager never overwrites an existing package directory', async (t) => {
  const s = await setup(t);
  const before = await readFile(path.join(s.packageDir, 'SHA256SUMS'));
  await assert.rejects(packageBuild(s.build, s.packageDir), /NMLB_OUTPUT_EXISTS/);
  assert.deepEqual(await readFile(path.join(s.packageDir, 'SHA256SUMS')), before);
});

test('packager rejects damaged UTF-8 manifests instead of replacing invalid bytes', async (t) => {
  const s = await setup(t);
  const invalid = Buffer.concat([
    Buffer.from('{"id":"no-mess-left-behind","version":"0.1.0","name":"'),
    Buffer.from([0x80]),
    Buffer.from('"}'),
  ]);
  await put(s.build, 'manifest.json', invalid);
  const output = path.join(s.root, 'damaged-package');
  await assert.rejects(packageBuild(s.build, output), /NMLB_MANIFEST/);
  await assert.rejects(access(output));
});
