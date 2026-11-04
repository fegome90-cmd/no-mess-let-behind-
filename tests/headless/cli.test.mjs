import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { access, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fixture, put } from './helpers.mjs';

function cli(script, args) {
  return JSON.parse(
    execFileSync(process.execPath, [path.resolve('tools', script), ...args], { encoding: 'utf8' }),
  );
}
test('doctor CLI inspects an empty synthetic vault without creating files', async (t) => {
  const root = await fixture(t);
  assert.equal(cli('doctor.mjs', ['--vault', root]).metadata, 'ABSENT');
  await assert.rejects(access(path.join(root, '.obsidian')));
});
test('package/install/remove CLI performs the complete offline file roundtrip', async (t) => {
  const root = await fixture(t);
  const build = path.join(root, 'build');
  await mkdir(build);
  await put(build, 'main.js', '// synthetic executable, never loaded\n');
  await put(build, 'manifest.json', '{"id":"no-mess-left-behind","version":"0.1.0"}');
  await put(build, 'styles.css', '/* fixture */');
  const pkg = path.join(root, 'package');
  assert.equal(cli('package.mjs', ['--build', build, '--out', pkg]).status, 'PACKAGED');
  const vault = path.join(root, 'vault');
  await mkdir(vault);
  await put(vault, '.obsidian/community-plugins.json', '[]');
  const args = ['--vault', vault, '--package', pkg];
  const plan = cli('install.mjs', args);
  assert.equal(plan.action, 'INSTALL');
  assert.equal(
    cli('install.mjs', [...args, '--apply', '--app-closed', '--expect', plan.planId]).status,
    'INSTALLED',
  );
  const removeArgs = ['--vault', vault, '--remove'];
  const removal = cli('install.mjs', removeArgs);
  assert.equal(
    cli('install.mjs', [...removeArgs, '--apply', '--app-closed', '--expect', removal.planId])
      .status,
    'REMOVED',
  );
  assert.equal(await readFile(path.join(vault, '.obsidian/community-plugins.json'), 'utf8'), '[]');
});
