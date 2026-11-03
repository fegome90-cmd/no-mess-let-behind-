import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { runBounded, summarizeRun } from '../../tools/lib/runner.mjs';
import { fixture, put } from './helpers.mjs';

async function run(t, source, options = {}) {
  const cwd = await fixture(t);
  const script = await put(cwd, 'command.mjs', source);
  return runBounded({ executable: process.execPath, args: [script], cwd, ...options });
}
test('runs an actual subprocess with arguments and no shell interpolation', async (t) => {
  const cwd = await fixture(t);
  const script = await put(cwd, 'echo.mjs', 'console.log(process.argv[2]);');
  const result = await runBounded({
    executable: process.execPath,
    cwd,
    args: [script, '; echo injected $(whoami)'],
  });
  assert.equal(result.status, 'OK');
  assert.equal(result.stdout.trim(), '; echo injected $(whoami)');
});
test('nonzero exit is not PASS', async (t) => {
  const result = await run(t, 'process.exit(7);');
  assert.equal(result.status, 'EXIT_NONZERO');
  assert.equal(result.exitCode, 7);
});
test('timeout terminates a real noncooperating process', async (t) => {
  const result = await run(t, 'process.on("SIGTERM",()=>{}); setInterval(()=>{},100);', {
    timeoutMs: 200,
  });
  assert.equal(result.status, 'TIMEOUT');
});
test('combined stdout/stderr is bounded', async (t) => {
  const result = await run(
    t,
    'process.stdout.write("x".repeat(700)); process.stderr.write("y".repeat(700));',
    { maxBytes: 1000 },
  );
  assert.equal(result.status, 'OUTPUT_LIMIT');
  assert(Buffer.byteLength(result.stdout + result.stderr) <= 1000);
});
test('sensitive environment is not inherited', async (t) => {
  process.env.NMLB_TEST_SECRET = 'SENTINEL';
  try {
    const result = await run(t, 'console.log(process.env.NMLB_TEST_SECRET ?? "absent");');
    assert.equal(result.stdout.trim(), 'absent');
  } finally {
    delete process.env.NMLB_TEST_SECRET;
  }
});
test('abort before spawn and during execution are explicit', async (t) => {
  const controller = new AbortController();
  controller.abort();
  assert.equal((await run(t, 'process.exit(0);', { signal: controller.signal })).status, 'ABORTED');
  const running = new AbortController();
  const timer = setTimeout(() => running.abort(), 150);
  try {
    assert.equal(
      (await run(t, 'setInterval(()=>{},100);', { signal: running.signal })).status,
      'ABORTED',
    );
  } finally {
    clearTimeout(timer);
  }
});
test('missing executable is a safe error; invalid limits reject', async (t) => {
  const cwd = await fixture(t);
  const result = await runBounded({ executable: path.join(cwd, 'missing'), args: [], cwd });
  assert.equal(result.status, 'SPAWN_ERROR');
  assert(!JSON.stringify(summarizeRun(result)).includes(cwd));
  await assert.rejects(
    runBounded({ executable: process.execPath, cwd, args: [], timeoutMs: 0 }),
    /NMLB_LIMIT/,
  );
});
test('public summaries contain no stdout, stderr or command arguments', async (t) => {
  const result = await run(t, 'console.log("SECRET STDOUT"); console.error("SECRET STDERR");');
  const publicResult = summarizeRun(result);
  assert.equal(publicResult.status, 'OK');
  assert(!JSON.stringify(publicResult).includes('SECRET'));
  assert.equal(publicResult.stdoutBytes, 14);
});
