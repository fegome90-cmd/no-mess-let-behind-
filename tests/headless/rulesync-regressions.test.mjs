import assert from 'node:assert/strict';
import test from 'node:test';
import * as providers from '../../tools/lib/providers.mjs';

const operation = (path) => ({ action: 'write', kind: 'file', feature: 'hooks', path });
const valid = () => ({
  success: true,
  command: 'generate',
  version: '43.6.0',
  data: {
    features: { hooks: {} },
    plan: {
      version: 2,
      operations: [operation('.claude/settings.json'), operation('.codex/hooks.json')],
    },
  },
});
const validate = (value) => {
  assert.equal(typeof providers.validateRulesyncPreview, 'function');
  return providers.validateRulesyncPreview(JSON.stringify(value));
};

test('A04: known Rulesync envelope and both fixture targets are required', () => {
  assert.equal(validate(valid()).operations.length, 2);
});
for (const [label, value] of [
  ['null', null],
  ['array', []],
  ['empty object', {}],
  ['error envelope', { ...valid(), success: false, error: { code: 'FAILED' } }],
  ['wrong version', { ...valid(), version: 'unknown' }],
  ['wrong command', { ...valid(), command: 'install' }],
  ['no feature summary', { ...valid(), data: { plan: valid().data.plan } }],
  [
    'unknown plan',
    {
      ...valid(),
      data: { ...valid().data, plan: { version: 999, operations: valid().data.plan.operations } },
    },
  ],
  ['empty plan', { ...valid(), data: { ...valid().data, plan: { version: 2, operations: [] } } }],
])
  test(`A04: reject ${label}`, () => assert.throws(() => validate(value), /NMLB_RULESYNC_PREVIEW/));

test('A04: missing target, deletion, traversal and malformed operation are rejected', () => {
  for (const ops of [
    [operation('.claude/settings.json')],
    [...valid().data.plan.operations, { ...operation('other'), action: 'delete' }],
    [...valid().data.plan.operations, operation('../outside')],
    [...valid().data.plan.operations, null],
  ]) {
    const value = valid();
    value.data.plan.operations = ops;
    assert.throws(() => validate(value), /NMLB_RULESYNC_PREVIEW/);
  }
});

test('A04: generated handlers preserve foreign command and do not duplicate ownership', () => {
  assert.equal(typeof providers.validateFixtureHooks, 'function');
  const document = (commands) => ({
    hooks: { PreToolUse: [{ hooks: commands.map((command) => ({ type: 'command', command })) }] },
  });
  const managed = 'echo NMLB_MANAGED_FIXTURE';
  providers.validateFixtureHooks(
    { ...document(['echo KEEP', managed]), fixture: 'KEEP_UNRELATED' },
    document([managed]),
  );
  for (const commands of [
    [managed],
    ['echo KEEP'],
    ['echo KEEP', managed, managed],
    ['echo KEEP', 'echo WRONG'],
  ]) {
    assert.throws(
      () =>
        providers.validateFixtureHooks(
          { ...document(commands), fixture: 'KEEP_UNRELATED' },
          document([managed]),
        ),
      /NMLB_RULESYNC_CONTENT/,
    );
  }
});
