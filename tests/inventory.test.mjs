import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectVault } from '../dist/features/inventory/inventory.js';

test('reports all five governance surfaces as absent, never enforced', async () => {
  const rows = await inspectVault({ exists: async () => false });
  assert.equal(rows.length, 5);
  for (const row of rows) {
    assert.equal(row.presence, 'ABSENT');
    assert.equal(row.execution, 'NOT_RUN');
  }
});

test('configuration presence is not execution evidence', async () => {
  const rows = await inspectVault({ exists: async (p) => p === '.vale.ini' });
  const vale = rows.find((row) => row.id === 'vale');
  assert.equal(vale.presence, 'PRESENT');
  assert.equal(vale.execution, 'NOT_RUN');
  assert.deepEqual(vale.paths, ['.vale.ini']);
});

test('failed probing is ERROR, not ABSENT or PASS, and never leaks exception text', async () => {
  const rows = await inspectVault({ exists: async () => { throw new Error('secret-fixture'); } });
  assert(rows.every((row) => row.presence === 'ERROR'));
  assert(rows.every((row) => row.code === 'NMLB_PROBE_FAILED'));
  assert(!JSON.stringify(rows).includes('secret-fixture'));
});

test('a partial probe error cannot be hidden behind a present config', async () => {
  const rows = await inspectVault({ exists: async (p) => {
    if (p === '.rulesync/hooks.jsonc') throw new Error('unreadable');
    return p === 'rulesync.jsonc';
  } });
  assert.equal(rows.find((row) => row.id === 'rulesync').presence, 'ERROR');
});

test('two hook definition alternatives require review, not silent precedence', async () => {
  const rows = await inspectVault({ exists: async (p) => p.startsWith('.rulesync/hooks.') });
  assert.equal(rows.find((row) => row.id === 'rulesync').code, 'NMLB_SOURCE_AMBIGUOUS');
});

test('only fixed, relative paths are probed and no note contents are read', async () => {
  const paths = [];
  const probe = { exists: async (path) => { paths.push(path); return false; },
    read: () => assert.fail('content must not be read'), write: () => assert.fail('must not write') };
  await inspectVault(probe);
  assert(paths.length > 0 && paths.length <= 12);
  assert.equal(new Set(paths).size, paths.length);
  assert(paths.every((p) => !p.startsWith('/') && !p.includes('..') && !p.includes('\\')));
});

test('concurrent inspections keep their results isolated', async () => {
  const [a, b] = await Promise.all([
    inspectVault({ exists: async () => true }), inspectVault({ exists: async () => false }),
  ]);
  assert(a.every((row) => row.presence === 'PRESENT'));
  assert(b.every((row) => row.presence === 'ABSENT'));
});
