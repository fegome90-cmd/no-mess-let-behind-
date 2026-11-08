import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { capturePackageIdentity, nativeOutcome } from './e2e/support/receipt.mjs';

test('native receipts cannot pass failed teardown or a failed checkpoint', () => {
  const checks = [{ status: 'PASS' }];
  assert.equal(nativeOutcome(checks, 1, true), 'PASS');
  assert.equal(nativeOutcome(checks, 1, false), 'FAIL');
  assert.equal(nativeOutcome([{ status: 'FAIL' }], 1, true), 'FAIL');
  assert.equal(nativeOutcome([], 1, true), 'FAIL');
});
test('native identity snapshots the actual package before execution and is immutable', async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), 'nmlb-identity-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(path.join(root, 'main.js'), 'package-A');
  const identity = await capturePackageIdentity(root, {
    sourceSha: 'a'.repeat(40),
    sourceDirty: false,
  });
  await writeFile(path.join(root, 'main.js'), 'package-B');
  assert.equal(identity.bundleSha256, createHash('sha256').update('package-A').digest('hex'));
  assert(Object.isFrozen(identity));
});
