import assert from 'node:assert/strict';
import test from 'node:test';
import * as providers from '../../tools/lib/providers.mjs';

function failure(message) {
  try {
    assert.equal('PRIVATE_SENTINEL', 'expected', message);
  } catch (error) {
    return error;
  }
}

test('provider receipts retain the assertion reason without the generated value diff', () => {
  assert.equal(typeof providers.providerFailureCode, 'function');
  for (const code of ['VERSION_MISMATCH', 'PLAN_CHANGED', 'PREVIEW_MUTATED_FIXTURE']) {
    const error = failure(code);
    assert(error.message.includes('PRIVATE_SENTINEL'));
    assert.equal(providers.providerFailureCode(error), code);
  }
});

test('provider receipts do not expose arbitrary assertion messages', () => {
  assert.equal(typeof providers.providerFailureCode, 'function');
  assert.equal(providers.providerFailureCode(failure('PRIVATE_SENTINEL')), 'ERR_ASSERTION');
  assert.equal(
    providers.providerFailureCode({ code: 'NMLB_RULESYNC_PREVIEW' }),
    'NMLB_RULESYNC_PREVIEW',
  );
  assert.equal(providers.providerFailureCode(new Error('PRIVATE_SENTINEL')), 'NMLB_PROVIDER_SMOKE');
});
