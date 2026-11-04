import assert from 'node:assert/strict';
import test from 'node:test';
import { parseFindings, providerArgs } from '../../tools/lib/providers.mjs';

test('plans invoke read-only modes, never install/fix/watch or shell', () => {
  assert(providerArgs('rulesync').includes('--dry-run'));
  assert(!providerArgs('rulesync').includes('--delete'));
  assert(providerArgs('vale', 'docs/space name.md').includes('./docs/space name.md'));
  assert.equal(providerArgs('rumdl')[0], 'check');
  assert(providerArgs('rumdl').includes('--no-cache'));
  assert(!providerArgs('rumdl').includes('--fix'));
  assert(providerArgs('gitleaks').includes('--redact=100'));
});
test('unrecognized providers and escaped paths fail explicitly', () => {
  assert.throws(() => providerArgs('shell'), /NMLB_PROVIDER/);
  assert.throws(() => providerArgs('vale', '../private.md'), /NMLB_PATH/);
});
test('invalid JSON and technical failures never count as clean', () => {
  for (const status of ['TIMEOUT', 'OUTPUT_LIMIT', 'SPAWN_ERROR', 'ABORTED']) {
    assert.equal(parseFindings('vale', { status, exitCode: null, stdout: '{}' }).status, 'ERROR');
  }
  assert.equal(
    parseFindings('rumdl', { status: 'OK', exitCode: 0, stdout: 'garbage' }).status,
    'ERROR',
  );
  assert.equal(
    parseFindings('vale', { status: 'EXIT_NONZERO', exitCode: 2, stdout: '{}' }).status,
    'ERROR',
  );
});
test('findings are summarized without echoing note contents', () => {
  const result = parseFindings('vale', {
    status: 'EXIT_NONZERO',
    exitCode: 1,
    stdout: '{"secret.md":[{"Message":"SENSITIVE NOTE"}]}',
  });
  assert.equal(result.status, 'FINDINGS');
  assert.equal(result.findingCount, 1);
  assert(!JSON.stringify(result).includes('SENSITIVE'));
  assert(!JSON.stringify(result).includes('secret.md'));
  assert.equal(parseFindings('rumdl', { status: 'OK', exitCode: 0, stdout: '[]' }).status, 'CLEAN');
});
test('unexpected output shapes are errors, not zero findings', () => {
  assert.equal(
    parseFindings('vale', { status: 'OK', exitCode: 0, stdout: '{"error":"failed"}' }).status,
    'ERROR',
  );
  assert.equal(parseFindings('rumdl', { status: 'OK', exitCode: 0, stdout: '{}' }).status, 'ERROR');
});
