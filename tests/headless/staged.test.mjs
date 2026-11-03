import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, symlink } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { inspectIndex } from '../../tools/lib/staged.mjs';
import { fixture, put } from './helpers.mjs';

const gitBin = '/usr/bin/git';
function git(root, ...args) {
  return execFileSync(
    gitBin,
    [
      '-c',
      'core.hooksPath=/dev/null',
      '-c',
      'user.name=Fixture',
      '-c',
      'user.email=fixture@example.invalid',
      ...args,
    ],
    {
      cwd: root,
      encoding: 'utf8',
      env: {
        PATH: '/usr/bin:/bin',
        HOME: root,
        GIT_CONFIG_NOSYSTEM: '1',
        GIT_CONFIG_GLOBAL: '/dev/null',
      },
    },
  );
}
async function repo(t) {
  const root = await fixture(t);
  git(root, 'init', '-q');
  await put(root, '00_KERNEL/locked.md', '# Baseline\n');
  git(root, 'add', '.');
  git(root, 'commit', '-qm', 'fixture');
  return root;
}
test('staged snapshot hashes index bytes, not corrected working tree', async (t) => {
  const root = await repo(t);
  await put(root, 'docs/a.md', 'old staged body\n');
  git(root, 'add', 'docs/a.md');
  await put(root, 'docs/a.md', '# Corrected but unstaged\n');
  const result = await inspectIndex(root);
  assert.equal(result.scopeStatus, 'PASS');
  assert.equal(result.quality, 'NOT_RUN');
  assert.equal(
    result.changes[0].contentHash,
    createHash('sha256').update('old staged body\n').digest('hex'),
  );
  assert(!JSON.stringify(result).includes('old staged body'));
});
test('protected deletion blocks scope gate', async (t) => {
  const root = await repo(t);
  git(root, 'rm', '-q', '00_KERNEL/locked.md');
  assert.equal((await inspectIndex(root, { protectedPaths: ['00_KERNEL'] })).scopeStatus, 'FAIL');
});
test('protected rename source is checked as well as destination', async (t) => {
  const root = await repo(t);
  git(root, 'mv', '00_KERNEL/locked.md', 'moved.md');
  const result = await inspectIndex(root, { protectedPaths: ['00_KERNEL'] });
  assert.equal(result.scopeStatus, 'FAIL');
  assert(result.findings.some((f) => f.code === 'NMLB_PROTECTED'));
  assert.equal(result.changes[0].fromPath, '00_KERNEL/locked.md');
});
test('prefix siblings are not incorrectly protected; spaces and Unicode work', async (t) => {
  const root = await repo(t);
  await put(root, '00_KERNEL_other/ñ space.md', '# Fine\n');
  git(root, 'add', '.');
  assert.equal((await inspectIndex(root, { protectedPaths: ['00_KERNEL'] })).scopeStatus, 'PASS');
});
test('staged symlink is refused and never dereferenced', async (t) => {
  const root = await repo(t);
  await symlink('/etc/passwd', path.join(root, 'docs.md'));
  git(root, 'add', 'docs.md');
  const result = await inspectIndex(root);
  assert.equal(result.scopeStatus, 'FAIL');
  assert(result.findings.some((f) => f.code === 'NMLB_INDEX_MODE'));
});
test('oversized and binary Markdown are explicit errors', async (t) => {
  const root = await repo(t);
  await put(root, 'large.md', 'x'.repeat(128));
  git(root, 'add', 'large.md');
  assert(
    (await inspectIndex(root, { maxBlobBytes: 32 })).findings.some(
      (f) => f.code === 'NMLB_TOO_LARGE',
    ),
  );
  git(root, 'reset', '-q', 'HEAD', '--', 'large.md');
  await put(root, 'binary.md', Buffer.from([0, 1, 2]));
  git(root, 'add', 'binary.md');
  assert((await inspectIndex(root)).findings.some((f) => f.code === 'NMLB_BINARY'));
});
test('empty index and unborn repository are valid inputs', async (t) => {
  const root = await fixture(t);
  git(root, 'init', '-q');
  assert.equal((await inspectIndex(root)).changes.length, 0);
  await put(root, 'first.md', '# First\n');
  git(root, 'add', '.');
  assert.equal((await inspectIndex(root)).scopeStatus, 'PASS');
});
test('inspection does not change index bytes or stage work', async (t) => {
  const root = await repo(t);
  await put(root, 'note.md', '# Note\n');
  git(root, 'add', 'note.md');
  const index = path.join(root, '.git/index');
  const before = await readFile(index);
  await inspectIndex(root);
  assert.deepEqual(await readFile(index), before);
});
