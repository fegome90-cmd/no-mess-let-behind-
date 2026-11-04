import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, symlink } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { inspectIndex } from '../../tools/lib/staged.mjs';
import { fixture, put } from './helpers.mjs';

const git = (root, args, extra = {}) =>
  execFileSync(
    '/usr/bin/git',
    ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', ...args],
    {
      cwd: root,
      env: {
        PATH: '/usr/bin:/bin',
        HOME: root,
        GIT_CONFIG_NOSYSTEM: '1',
        GIT_CONFIG_GLOBAL: '/dev/null',
        ...extra,
      },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

async function aliasedRepo(t) {
  const parent = await fixture(t);
  const physical = path.join(parent, 'physical');
  const root = path.join(physical, 'repo');
  const alias = path.join(parent, 'alias/repo');
  await mkdir(root, { recursive: true });
  await symlink(physical, path.dirname(alias), 'dir');
  git(root, ['-c', 'init.templateDir=', 'init', '-q']);
  await put(root, '00_KERNEL/locked.md', '# Original\n');
  git(root, ['add', '.']);
  git(root, ['commit', '-qm', 'baseline']);
  const index = path.join(root, '.git/alternate');
  git(root, ['read-tree', 'HEAD'], { GIT_INDEX_FILE: index });
  await put(root, '00_KERNEL/locked.md', '# Protected change\n');
  git(root, ['add', '00_KERNEL/locked.md'], { GIT_INDEX_FILE: index });
  return { parent, root, alias, index };
}

for (const form of ['absolute', 'relative']) {
  test(`A1: ${form} index through an aliased ancestor checks the effective index`, async (t) => {
    const { root, alias, index } = await aliasedRepo(t);
    const aliasedIndex = path.join(alias, '.git/alternate');
    const before = await readFile(index);
    const report = await inspectIndex(alias, {
      protectedPaths: ['00_KERNEL'],
      environment: {
        GIT_INDEX_FILE:
          form === 'absolute' ? aliasedIndex : path.relative(process.cwd(), aliasedIndex),
      },
    });
    assert.equal(report.scopeStatus, 'FAIL');
    assert(report.findings.some((f) => f.code === 'NMLB_PROTECTED'));
    assert.deepEqual(await readFile(index), before);
    assert.equal(git(root, ['diff', '--cached', '--name-only']).trim(), '');
  });
}

test('A1: canonicalizing ancestors does not allow a symlink index or an outside index', async (t) => {
  const { parent, root, alias } = await aliasedRepo(t);
  await symlink('alternate', path.join(root, '.git/leaf-link'));
  const outside = path.join(parent, 'outside');
  await mkdir(outside);
  await symlink(outside, path.join(root, '.git/outside-link'), 'dir');
  for (const index of [
    path.join(alias, '.git/leaf-link'),
    path.join(alias, '.git/outside-link/index'),
    path.join(alias, '.git/missing-parent/index'),
  ]) {
    await assert.rejects(
      inspectIndex(root, { environment: { GIT_INDEX_FILE: index } }),
      /NMLB_GIT_INDEX/,
    );
  }
});

test('A1: shared fixture root is canonical when TMPDIR has an aliased ancestor', async (t) => {
  const parent = await fixture(t);
  const physical = path.join(parent, 'physical-tmp');
  const alias = path.join(parent, 'alias-tmp');
  await mkdir(physical);
  await symlink(physical, alias, 'dir');
  const script = `
    import assert from 'node:assert/strict';
    import { realpath } from 'node:fs/promises';
    import { fixture } from ${JSON.stringify(new URL('./helpers.mjs', import.meta.url).href)};
    let cleanup;
    const root = await fixture({ after(fn) { cleanup = fn; } });
    try { assert.equal(root, await realpath(root)); } finally { await cleanup(); }
  `;
  execFileSync(process.execPath, ['--input-type=module', '--eval', script], {
    env: { TMPDIR: alias, PATH: '/usr/bin:/bin' },
    stdio: 'pipe',
    timeout: 5000,
  });
});
