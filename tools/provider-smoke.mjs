import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import {
  PROVIDER_VERSIONS,
  parseFindings,
  providerArgs,
  validateFixtureHooks,
  validateRulesyncPreview,
} from './lib/providers.mjs';
import { runBounded, summarizeRun } from './lib/runner.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { values } = parseArgs({
  options: Object.fromEntries(
    Object.keys(PROVIDER_VERSIONS).map((name) => [name, { type: 'string' }]),
  ),
});
const results = [];
async function snapshot(root, prefix = '') {
  const hashes = {};
  for (const entry of await readdir(path.join(root, prefix), { withFileTypes: true })) {
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (name === 'report.json') continue;
    if (entry.isDirectory()) Object.assign(hashes, await snapshot(root, name));
    else
      hashes[name] = createHash('sha256')
        .update(await readFile(path.join(root, name)))
        .digest('hex');
  }
  return hashes;
}
for (const [tool, version] of Object.entries(PROVIDER_VERSIONS)) {
  const cwd = await mkdtemp(path.join(tmpdir(), `nmlb-${tool}-`));
  const executable = values[tool];
  const row = { tool, expectedVersion: version, status: 'ERROR', checks: [] };
  try {
    assert(executable && path.isAbsolute(executable), 'ABSOLUTE_EXECUTABLE_REQUIRED');
    const call = (args) => runBounded({ executable, cwd, args, timeoutMs: 30_000 });
    row.phase = 'version';
    const v = await call(tool === 'gitleaks' ? ['version'] : ['--version']);
    assert.equal(v.status, 'OK', 'VERSION_COMMAND_FAILED');
    const observed = `${v.stdout} ${v.stderr}`.match(/\b\d+\.\d+\.\d+\b/)?.[0];
    assert.equal(observed, version, 'VERSION_MISMATCH');
    row.observedVersion = observed;
    async function copy(from, to) {
      await mkdir(path.dirname(path.join(cwd, to)), { recursive: true });
      await writeFile(path.join(cwd, to), await readFile(path.join(repo, from)));
    }
    if (tool === 'rulesync') {
      await copy('profiles/rulesync/rulesync.jsonc', 'rulesync.jsonc');
      await copy('profiles/rulesync/.rulesync/hooks.jsonc', '.rulesync/hooks.jsonc');
      await mkdir(path.join(cwd, '.claude'));
      await writeFile(
        path.join(cwd, '.claude/settings.json'),
        '{"fixture":"KEEP_UNRELATED","hooks":{"PreToolUse":[{"hooks":[{"type":"command","command":"echo KEEP"}]}]}}',
      );
      const before = await snapshot(cwd);
      row.phase = 'preview';
      const preview = await call(providerArgs(tool));
      row.execution = summarizeRun(preview);
      assert.equal(preview.status, 'OK', 'PREVIEW_FAILED');
      const plan = validateRulesyncPreview(preview.stdout);
      assert.deepEqual(await snapshot(cwd), before, 'PREVIEW_MUTATED_FIXTURE');
      // Plans list paths/keys, not hook payloads. Check payloads by generating only
      // in this disposable fixture; no native hook or user vault is executed.
      row.phase = 'scratch-generation';
      const generated = await call(providerArgs(tool).filter((arg) => arg !== '--dry-run'));
      assert.equal(generated.status, 'OK', 'SCRATCH_GENERATION_FAILED');
      assert.deepEqual(validateRulesyncPreview(generated.stdout), plan, 'PLAN_CHANGED');
      validateFixtureHooks(
        JSON.parse(await readFile(path.join(cwd, '.claude/settings.json'), 'utf8')),
        JSON.parse(await readFile(path.join(cwd, '.codex/hooks.json'), 'utf8')),
      );
      row.checks.push(
        'version',
        'versioned plan and both targets',
        'dry-run no writes',
        'scratch output matches plan',
        'foreign and managed handlers preserved',
      );
    } else {
      await mkdir(path.join(cwd, 'docs'));
      if (tool === 'vale') {
        await copy('profiles/editorial/.vale.ini', '.vale.ini');
        await copy(
          'profiles/editorial/styles/NMLB/EmptyPhrases.yml',
          'styles/NMLB/EmptyPhrases.yml',
        );
      } else if (tool === 'rumdl') await copy('profiles/editorial/.rumdl.toml', '.rumdl.toml');
      else await copy('profiles/security/.gitleaks.toml', '.gitleaks.toml');
      const good =
        '# Nota\n\nContenido claro.\n\n```text\n#Sin espacio\nEn el vertiginoso mundo\n```\n';
      const bad =
        tool === 'vale'
          ? '# Nota\n\nEn el vertiginoso mundo.\n'
          : tool === 'rumdl'
            ? '# Nota\n\n### Nivel saltado\n'
            : '# Nota\n\nnmlb_test_ABCDEFGHIJKLMNOP\n';
      for (const [label, text] of [
        ['clean', good],
        ['finding', bad],
      ]) {
        await writeFile(path.join(cwd, 'docs/check.md'), text);
        await rm(path.join(cwd, 'report.json'), { force: true });
        const before = await snapshot(cwd);
        row.phase = label;
        const result = await call(providerArgs(tool));
        if (tool === 'gitleaks') {
          try {
            result.stdout = await readFile(path.join(cwd, 'report.json'), 'utf8');
          } catch {
            result.stdout = result.exitCode === 0 ? '[]' : '';
          }
        }
        const summary = parseFindings(tool, result);
        row[label] = summary;
        assert.equal(
          summary.status,
          label === 'clean' ? 'CLEAN' : 'FINDINGS',
          'ENGINE_RESULT_MISMATCH',
        );
        assert.deepEqual(await snapshot(cwd), before, 'VALIDATOR_MUTATED_FIXTURE');
      }
      row.checks.push('version', 'clean document', 'finding document', 'read-only');
    }
    row.phase = 'complete';
    row.status = 'PASS';
  } catch (error) {
    row.code = error.code ?? 'NMLB_PROVIDER_SMOKE';
    process.exitCode = 1;
  } finally {
    await rm(cwd, { recursive: true, force: true });
    results.push(row);
  }
}
console.log(
  JSON.stringify(
    { schema: 'nmlb-provider-smoke/1', results, nativeAgentHooks: 'NOT_RUN' },
    null,
    2,
  ),
);
