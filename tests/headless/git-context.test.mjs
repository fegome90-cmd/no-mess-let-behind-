import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmod, readFile, symlink } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { inspectIndex } from '../../tools/lib/staged.mjs';
import { fixture, put } from './helpers.mjs';

const cli = fileURLToPath(new URL('../../tools/staged.mjs', import.meta.url));
const environment = (root, extra = {}) => ({
  PATH: `${path.dirname(process.execPath)}:/usr/bin:/bin`,
  HOME: root,
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_CONFIG_GLOBAL: '/dev/null',
  ...extra,
});
const args = (rest) => [
  '-c',
  'user.name=Fixture',
  '-c',
  'user.email=fixture@example.invalid',
  ...rest,
];
const git = (root, rest, extra = {}) =>
  execFileSync('/usr/bin/git', args(rest), {
    cwd: root,
    env: environment(root, extra),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
async function repo(t) {
  const root = await fixture(t);
  git(root, ['-c', 'init.templateDir=', 'init', '-q']);
  await put(root, '00_KERNEL/locked.md', '# Original\n');
  await put(root, 'docs/allowed.md', '# Original allowed\n');
  git(root, ['add', '.']);
  git(root, ['commit', '-qm', 'baseline']);
  return root;
}
async function hook(root) {
  const quote = (s) => `'${s.replaceAll("'", "'\\''")}'`;
  const file = await put(
    root,
    '.git/hooks/pre-commit',
    `#!/bin/sh\nexec ${quote(process.execPath)} ${quote(cli)} --vault "$PWD" --protect 00_KERNEL\n`,
  );
  await chmod(file, 0o700);
}

test('A02: alternate index controls inspection and is not changed', async (t) => {
  const root = await repo(t);
  const index = path.join(root, '.git/alternate');
  const env = { GIT_INDEX_FILE: index };
  git(root, ['read-tree', 'HEAD'], env);
  await put(root, '00_KERNEL/locked.md', '# Protected update\n');
  git(root, ['add', '00_KERNEL/locked.md'], env);
  const before = await readFile(index);
  const report = await inspectIndex(root, { protectedPaths: ['00_KERNEL'], environment: env });
  assert.equal(report.scopeStatus, 'FAIL');
  assert(report.findings.some((f) => f.code === 'NMLB_PROTECTED'));
  assert.deepEqual(await readFile(index), before);
  assert.equal(git(root, ['diff', '--cached', '--name-only']).trim(), '');
});

for (const mode of ['only', 'all', 'ordinary']) {
  test(`A02: real pre-commit blocks protected ${mode} commit`, async (t) => {
    const root = await repo(t);
    await hook(root);
    await put(root, '00_KERNEL/locked.md', '# Forbidden\n');
    if (mode === 'ordinary') git(root, ['add', '00_KERNEL/locked.md']);
    const before = git(root, ['rev-parse', 'HEAD']);
    const commitArgs =
      mode === 'only'
        ? ['commit', '--only', '-qm', 'blocked', '--', '00_KERNEL/locked.md']
        : ['commit', ...(mode === 'all' ? ['-a'] : []), '-qm', 'blocked'];
    const result = spawnSync('/usr/bin/git', args(commitArgs), {
      cwd: root,
      env: environment(root),
      encoding: 'utf8',
      timeout: 15000,
    });
    assert.equal(result.error, undefined);
    assert.notEqual(result.status, 0);
    assert.equal(git(root, ['rev-parse', 'HEAD']), before);
    assert.equal(git(root, ['show', 'HEAD:00_KERNEL/locked.md']), '# Original\n');
    assert(`${result.stdout}${result.stderr}`.includes('NMLB_PROTECTED'));
  });
}

test('A02: allowed partial commit does not inspect unrelated ordinary staging', async (t) => {
  const root = await repo(t);
  await hook(root);
  await put(root, '00_KERNEL/locked.md', '# Pending, not in this commit\n');
  git(root, ['add', '00_KERNEL/locked.md']);
  await put(root, 'docs/allowed.md', '# Allowed\n');
  git(root, ['commit', '--only', '-qm', 'allowed', '--', 'docs/allowed.md']);
  assert.equal(git(root, ['show', 'HEAD:00_KERNEL/locked.md']), '# Original\n');
  assert.equal(git(root, ['show', 'HEAD:docs/allowed.md']), '# Allowed\n');
  assert(git(root, ['diff', '--cached', '--name-only']).includes('00_KERNEL/locked.md'));
});

for (const action of ['delete', 'rename']) {
  test(`A02: alternate index ${action} protects source and destination`, async (t) => {
    const root = await repo(t);
    const env = { GIT_INDEX_FILE: path.join(root, '.git/alternate') };
    git(root, ['read-tree', 'HEAD'], env);
    git(
      root,
      action === 'delete'
        ? ['rm', '-q', '00_KERNEL/locked.md']
        : ['mv', '00_KERNEL/locked.md', 'moved.md'],
      env,
    );
    assert.equal(
      (await inspectIndex(root, { protectedPaths: ['00_KERNEL'], environment: env })).scopeStatus,
      'FAIL',
    );
  });
}

test('A02: linked worktree and temporary commit index remain supported', async (t) => {
  const root = await repo(t);
  await hook(root);
  const linked = path.join(root, 'linked');
  git(root, ['worktree', 'add', '-qb', 'synthetic-linked', linked]);
  await put(linked, '00_KERNEL/locked.md', '# Linked protected\n');
  const before = git(linked, ['rev-parse', 'HEAD']);
  const result = spawnSync(
    '/usr/bin/git',
    args(['commit', '--only', '-qm', 'blocked', '--', '00_KERNEL/locked.md']),
    {
      cwd: linked,
      env: environment(linked),
      encoding: 'utf8',
      timeout: 15000,
    },
  );
  assert.equal(result.error, undefined);
  assert.notEqual(result.status, 0);
  assert.equal(git(linked, ['rev-parse', 'HEAD']), before);
  assert(`${result.stdout}${result.stderr}`.includes('NMLB_PROTECTED'));
});

test('A02: unsupported, missing or symlink indices fail closed instead of using the default', async (t) => {
  const root = await repo(t);
  await symlink('index', path.join(root, '.git/symlink-index'));
  for (const env of [
    { GIT_INDEX_FILE: path.join(root, '.git/missing') },
    { GIT_INDEX_FILE: path.join(root, '.git/symlink-index') },
    { GIT_INDEX_FILE: path.join(root, 'outside-index') },
    { GIT_INDEX_FILE: '' },
    { GIT_DIR: '/unrelated/repository' },
    { GIT_OBJECT_DIRECTORY: '/unrelated/objects' },
  ])
    await assert.rejects(inspectIndex(root, { environment: env }), /NMLB_/);
});
