import assert from 'node:assert/strict';
import test from 'node:test';

test('B0: catalog ships immutable, source-pinned metadata only', async () => {
  const module = await import('../dist/features/profiles/catalog.js').catch(() => null);
  assert(module, 'compiled metadata catalog must exist');
  const items = module.listProfileMetadata();
  assert.equal(items.length, 4);
  assert(Object.isFrozen(items));
  assert.equal(new Set(items.map((item) => item.id)).size, items.length);
  for (const item of items) {
    assert(Object.isFrozen(item));
    assert(Object.isFrozen(item.potentialPaths));
    assert.match(item.sourceCommit, /^[0-9a-f]{40}$/);
    assert.equal(item.license, 'MIT');
    assert.equal(item.classification, 'fixture-only');
    assert.deepEqual(
      Object.keys(item).sort(),
      [
        'classification',
        'compatibleHosts',
        'id',
        'label',
        'license',
        'potentialPaths',
        'sourceCommit',
        'sourceRepository',
      ].sort(),
    );
    assert(item.potentialPaths.every((p) => !p.includes('..') && !p.startsWith('/')));
  }
  assert.throws(() => items[0].potentialPaths.push('new-path'));
});
