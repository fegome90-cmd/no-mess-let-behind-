import assert from 'node:assert/strict';
import { link, mkdir, readFile, symlink } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { inspectClaudian } from '../../tools/lib/doctor.mjs';
import { readBounded, readJson, relativePath } from '../../tools/lib/files.mjs';
import { fixture, put } from './helpers.mjs';

for (const value of ['../x', '/x', 'C:/x', 'a\\b', 'a/../b', 'a//b', '.', '', 'a\0b', 'a\nb']) {
  test(`reject ambiguous path ${JSON.stringify(value)}`, () => {
    assert.throws(() => relativePath(value), /NMLB_PATH/);
  });
}
test('accept normal relative configuration paths', () => {
  assert.equal(
    relativePath('.obsidian/plugins/realclaudian/manifest.json'),
    '.obsidian/plugins/realclaudian/manifest.json',
  );
});
test('bounded reader refuses oversize, symlinks, directories and hardlinks', async (t) => {
  const root = await fixture(t);
  const file = await put(root, 'ok.json', '{"ok":true}');
  assert.equal((await readBounded(root, 'ok.json', 32)).toString(), '{"ok":true}');
  await assert.rejects(readBounded(root, 'ok.json', 3), /NMLB_TOO_LARGE/);
  await symlink(file, path.join(root, 'alias.json'));
  await assert.rejects(readBounded(root, 'alias.json', 32), /NMLB_SYMLINK/);
  await mkdir(path.join(root, 'dir'));
  await assert.rejects(readBounded(root, 'dir', 32), /NMLB_NOT_FILE/);
  await link(file, path.join(root, 'hard.json'));
  await assert.rejects(readBounded(root, 'hard.json', 32), /NMLB_HARDLINK/);
});
test('intermediate symlink cannot escape the chosen root', async (t) => {
  const root = await fixture(t);
  const outside = await fixture(t);
  await put(outside, 'secret.json', '{"secret":"never read"}');
  await symlink(outside, path.join(root, 'escape'));
  const result = await readJson(root, 'escape/secret.json');
  assert.deepEqual(result, { state: 'ERROR', code: 'NMLB_SYMLINK' });
});
test('JSON parse errors expose neither data nor exception details', async (t) => {
  const root = await fixture(t);
  await put(root, 'bad.json', '{SECRET-CONTENT');
  assert.deepEqual(await readJson(root, 'bad.json'), { state: 'ERROR', code: 'NMLB_JSON' });
  assert.deepEqual(await readJson(root, 'missing.json'), { state: 'ABSENT' });
});
test('doctor distinguishes metadata, enablement and unobserved execution', async (t) => {
  const root = await fixture(t);
  await put(
    root,
    '.custom/plugins/realclaudian/manifest.json',
    JSON.stringify({ id: 'realclaudian', version: '1.2.3', secret: 'NEVER-REPORT' }),
  );
  await put(root, '.custom/community-plugins.json', '["realclaudian"]');
  await put(root, '.custom/plugins/realclaudian/data.json', 'DO NOT READ ME');
  const report = await inspectClaudian(root, '.custom');
  assert.equal(report.metadata, 'VALID');
  assert.equal(report.enabled, 'CONFIGURED');
  assert.equal(report.loaded, 'UNKNOWN');
  assert.equal(report.version, '1.2.3');
  assert.equal(report.routes.length, 6);
  assert(report.routes.every((r) => r.execution === 'NOT_RUN' && r.trust === 'UNKNOWN'));
  assert(!JSON.stringify(report).includes('NEVER-REPORT'));
  assert.equal(
    await readFile(path.join(root, '.custom/plugins/realclaudian/data.json'), 'utf8'),
    'DO NOT READ ME',
  );
});
test('missing host stays absent; metadata does not imply enablement', async (t) => {
  const root = await fixture(t);
  assert.equal((await inspectClaudian(root)).metadata, 'ABSENT');
  await put(
    root,
    '.obsidian/plugins/realclaudian/manifest.json',
    '{"id":"realclaudian","version":"1.2.3"}',
  );
  assert.equal((await inspectClaudian(root)).enabled, 'UNKNOWN');
  await put(root, '.obsidian/community-plugins.json', '[]');
  assert.equal((await inspectClaudian(root)).enabled, 'NOT_CONFIGURED');
});
test('invalid manifest and enablement are errors, not healthy absence', async (t) => {
  const root = await fixture(t);
  await put(
    root,
    '.obsidian/plugins/realclaudian/manifest.json',
    '{"id":"other","version":"secret data"}',
  );
  await put(root, '.obsidian/community-plugins.json', '{}');
  const report = await inspectClaudian(root);
  assert.equal(report.metadata, 'INVALID');
  assert.equal(report.enabled, 'ERROR');
  assert(!JSON.stringify(report).includes('secret data'));
});
