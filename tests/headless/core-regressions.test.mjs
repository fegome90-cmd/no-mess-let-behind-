import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { inspectClaudian } from '../../tools/lib/doctor.mjs';
import { readJson } from '../../tools/lib/files.mjs';
import { fixture, put } from './helpers.mjs';

test('A05: invalid UTF-8 cannot become VALID metadata', async (t) => {
  const root = await fixture(t);
  const invalid = Buffer.concat([
    Buffer.from('{"id":"realclaudian","version":"2.3.38","name":"'),
    Buffer.from([0x80]),
    Buffer.from('"}'),
  ]);
  const name = '.obsidian/plugins/realclaudian/manifest.json';
  await put(root, name, invalid);
  assert.deepEqual(await readJson(root, name), { state: 'ERROR', code: 'NMLB_JSON' });
  assert.equal((await inspectClaudian(root)).metadata, 'ERROR');
});

test('A06: community errors retain a separate sanitized cause', async (t) => {
  const root = await fixture(t);
  await put(root, '.obsidian/community-plugins.json', '{ PRIVATE_SENTINEL');
  const report = await inspectClaudian(root);
  assert.equal(report.enabled, 'ERROR');
  assert.equal(report.communityCode, 'NMLB_JSON');
  assert(!JSON.stringify(report).includes('PRIVATE_SENTINEL'));
  await put(root, '.obsidian/community-plugins.json', '{}');
  assert.equal((await inspectClaudian(root)).communityCode, 'NMLB_COMMUNITY_SCHEMA');
});

test('A03: CI routes cover actual integration and later promotion without dropping native E2E', async () => {
  const workflow = await readFile(
    new URL('../../.github/workflows/headless.yml', import.meta.url),
    'utf8',
  );
  // Guard the literal trigger contract. GitHub validates the YAML and actual runs validate routing.
  for (const event of ['push', 'pull_request']) {
    const section = workflow.match(new RegExp(`  ${event}:\\n    branches: \\[([^\\n]+)\\]`))?.[1];
    assert(section, `missing ${event} branches`);
    for (const branch of ['integration/headless-foundation', 'develop', 'main']) {
      assert(section.includes(`'${branch}'`), `${event} missing ${branch}`);
    }
  }
  assert(workflow.includes('pnpm verify:headless'));
  const native = await readFile(
    new URL('../../.github/workflows/verify.yml', import.meta.url),
    'utf8',
  );
  assert(native.includes('xvfb-run -a pnpm test:e2e'));
});
