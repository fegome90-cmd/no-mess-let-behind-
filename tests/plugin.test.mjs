import assert from 'node:assert/strict';
import test from 'node:test';
import Plugin from '../dist/main.js';
import { modals, notices, reset, textOf } from './fixtures/obsidian.mjs';

function makePlugin(exists = async () => false) {
  return new Plugin({
    vault: {
      adapter: {
        exists,
        read: () => assert.fail('must not read note contents'),
        write: () => assert.fail('must not write'),
      },
    },
  });
}

test('loads commands without scanning, persisting or starting background work', () => {
  let calls = 0;
  const plugin = makePlugin(async () => {
    calls++;
    return false;
  });
  plugin.onload();
  assert.equal(calls, 0);
  assert.deepEqual(
    plugin.commands.map((c) => c.id),
    ['inspect-vault', 'show-boundaries'],
  );
  assert.equal(plugin.icons.length, 1);
});

test('command displays evidence boundaries and present sources, not success claims', async () => {
  reset();
  const plugin = makePlugin(async (p) => p === '.vale.ini');
  plugin.onload();
  await plugin.commands.find((c) => c.id === 'inspect-vault').callback();
  assert.equal(modals.length, 1);
  const text = textOf(modals[0].contentEl);
  assert(text.includes('.vale.ini'));
  assert(text.includes('NOT_RUN'));
  assert(text.includes('no demuestra'));
});

test('simultaneous command invocations do not duplicate scans; lock is released', async () => {
  reset();
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const plugin = makePlugin(async () => {
    await gate;
    return false;
  });
  plugin.onload();
  const run = plugin.commands[0].callback;
  const first = run();
  await run();
  assert.equal(notices.length, 1);
  release();
  await first;
  await run();
  assert.equal(modals.length, 2);
});

test('probe failures are visible and their sensitive messages are discarded', async () => {
  reset();
  const plugin = makePlugin(async () => {
    throw new Error('secret-fixture');
  });
  plugin.onload();
  await plugin.commands[0].callback();
  const text = textOf(modals[0].contentEl);
  assert(text.includes('NMLB_PROBE_FAILED'));
  assert(!text.includes('secret-fixture'));
});

test('boundary command is read-only and makes deferred execution explicit', async () => {
  reset();
  const plugin = makePlugin(async () => assert.fail('must not probe'));
  plugin.onload();
  await plugin.commands[1].callback();
  assert(textOf(modals[0].contentEl).includes('No instala'));
});

test('unloading prevents a pending scan from opening a modal', async () => {
  reset();
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const plugin = makePlugin(async () => {
    await gate;
    return false;
  });
  plugin.onload();
  const first = plugin.commands[0].callback();
  plugin.onunload?.();
  release();
  await first;
  assert.equal(modals.length, 0);
});

test('unload closes an already open inventory report', async () => {
  reset();
  const plugin = makePlugin();
  plugin.onload();
  await plugin.commands[0].callback();
  const report = modals[0];
  plugin.onunload();
  assert.equal(report.closed, true);
});

test('unload closes the boundary dialog and repeated commands keep one active dialog', async () => {
  reset();
  const plugin = makePlugin();
  plugin.onload();
  await plugin.commands[1].callback();
  const first = modals[0];
  await plugin.commands[1].callback();
  assert.equal(first.closed, true);
  const second = modals[1];
  plugin.onunload();
  assert.equal(second.closed, true);
});
