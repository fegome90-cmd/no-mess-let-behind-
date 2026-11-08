import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
export async function capturePackageIdentity(packageDir, source) {
  return Object.freeze({
    ...source,
    bundleSha256: createHash('sha256')
      .update(await readFile(path.join(packageDir, 'main.js')))
      .digest('hex'),
  });
}
export function nativeOutcome(checks, expected, teardownPassed) {
  return teardownPassed &&
    checks.length === expected &&
    checks.every((check) => check.status === 'PASS')
    ? 'PASS'
    : 'FAIL';
}
