import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { runBounded } from '../../tools/lib/runner.mjs';
import { fixture, put } from './helpers.mjs';

for (const mode of ['TIMEOUT', 'ABORTED', 'OUTPUT_LIMIT']) {
  test(
    `A01: ${mode} stops a same-group child after its leader closes`,
    { timeout: 7000 },
    async (t) => {
      const cwd = await fixture(t);
      const pidfile = path.join(cwd, 'child.pid');
      const heartbeat = path.join(cwd, 'heartbeat');
      const child = await put(
        cwd,
        'child.mjs',
        `import fs from 'node:fs';
process.on('SIGTERM',()=>{});
fs.writeFileSync(${JSON.stringify(pidfile)}, String(process.pid));
let count=0; setInterval(()=>fs.writeFileSync(${JSON.stringify(heartbeat)}, String(++count)), 10);`,
      );
      const parent = await put(
        cwd,
        'parent.mjs',
        `import {spawn} from 'node:child_process';
import fs from 'node:fs';
spawn(process.execPath,[${JSON.stringify(child)}],{stdio:'ignore'});
setInterval(()=>{if(${JSON.stringify(mode)}==='OUTPUT_LIMIT' && fs.existsSync(${JSON.stringify(heartbeat)})) process.stdout.write('x'.repeat(2048));},20);`,
      );
      const controller = new AbortController();
      let pid;
      const running = runBounded({
        executable: process.execPath,
        args: [parent],
        cwd,
        timeoutMs: 1200,
        maxBytes: 1024,
        signal: controller.signal,
      });
      try {
        for (let n = 0; n < 100; n++) {
          try {
            pid = Number(await readFile(pidfile, 'utf8'));
            await readFile(heartbeat);
            break;
          } catch {
            await delay(10);
          }
        }
        assert(pid, 'child must have started; otherwise the test is inconclusive');
        if (mode === 'ABORTED') controller.abort();
        const result = await running;
        assert.equal(result.status, mode);
        await delay(30);
        const before = await readFile(heartbeat, 'utf8');
        await delay(250);
        assert.equal(
          await readFile(heartbeat, 'utf8'),
          before,
          'descendant still executing after terminal result',
        );
      } finally {
        controller.abort();
        await running;
        if (pid) {
          try {
            process.kill(pid, 'SIGKILL');
          } catch {
            /* fixture already stopped */
          }
        }
      }
    },
  );
}

test('Git override is explicit and cannot inject arbitrary environment', async (t) => {
  const cwd = await fixture(t);
  const script = await put(
    cwd,
    'env.mjs',
    'console.log(JSON.stringify({index:process.env.GIT_INDEX_FILE,secret:process.env.NMLB_TEST_SECRET}));',
  );
  const index = path.join(cwd, 'alternate');
  const result = await runBounded({
    executable: process.execPath,
    cwd,
    args: [script],
    env: { GIT_INDEX_FILE: index },
  });
  assert.deepEqual(JSON.parse(result.stdout), { index });
  for (const env of [
    { PATH: '/arbitrary' },
    { NODE_OPTIONS: '--inspect' },
    { GIT_INDEX_FILE: 'relative' },
    { NMLB_TEST_SECRET: 'SENTINEL' },
  ]) {
    await assert.rejects(runBounded({ executable: process.execPath, cwd, env }), /NMLB_ENV/);
  }
});
