import { spawn } from 'node:child_process';
import path from 'node:path';
import { BoundaryError, canonicalRoot } from './files.mjs';

/** Explicit binary + argv, minimal environment, bounded output and lifetime. Not a sandbox. */
export async function runBounded({
  executable,
  args = [],
  cwd,
  timeoutMs = 10_000,
  maxBytes = 1_048_576,
  signal,
}) {
  if (
    !path.isAbsolute(executable) ||
    !Array.isArray(args) ||
    args.some((v) => typeof v !== 'string' || v.includes('\0')) ||
    args.length > 128 ||
    args.join('').length > 1_048_576
  )
    throw new BoundaryError('NMLB_COMMAND');
  if (
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs < 1 ||
    timeoutMs > 120_000 ||
    !Number.isSafeInteger(maxBytes) ||
    maxBytes < 1 ||
    maxBytes > 16_777_216
  )
    throw new BoundaryError('NMLB_LIMIT');
  const root = await canonicalRoot(cwd);
  if (signal?.aborted) return { status: 'ABORTED', exitCode: null, stdout: '', stderr: '' };
  return new Promise((resolve) => {
    const chunks = { stdout: [], stderr: [] };
    let count = 0;
    let terminal = null;
    let settled = false;
    let escalation;
    let cutoff;
    const child = spawn(executable, args, {
      cwd: root,
      shell: false,
      windowsHide: true,
      detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        PATH: `${path.dirname(process.execPath)}${path.delimiter}/usr/bin${path.delimiter}/bin`,
        HOME: root,
        USERPROFILE: root,
        XDG_CONFIG_HOME: path.join(root, '.config'),
        LANG: 'C.UTF-8',
        TZ: 'UTC',
        NO_COLOR: '1',
        ...(process.platform === 'win32' ? { SystemRoot: process.env.SystemRoot } : {}),
      },
    });
    const kill = (kind) => {
      try {
        if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, kind);
        else child.kill(kind);
      } catch {
        /* The process may already have exited. */
      }
    };
    const finish = (exitCode) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      clearTimeout(escalation);
      clearTimeout(cutoff);
      signal?.removeEventListener('abort', abort);
      resolve({
        status: terminal ?? (exitCode === 0 ? 'OK' : 'EXIT_NONZERO'),
        exitCode: exitCode ?? null,
        stdout: Buffer.concat(chunks.stdout).toString('utf8'),
        stderr: Buffer.concat(chunks.stderr).toString('utf8'),
      });
    };
    const stop = (status) => {
      if (terminal || settled) return;
      terminal = status;
      kill('SIGTERM');
      escalation = setTimeout(() => kill('SIGKILL'), 100);
      cutoff = setTimeout(() => {
        kill('SIGKILL');
        child.stdout.destroy();
        child.stderr.destroy();
        finish(null);
      }, 300);
    };
    const abort = () => stop('ABORTED');
    const deadline = setTimeout(() => stop('TIMEOUT'), timeoutMs);
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    for (const stream of ['stdout', 'stderr']) {
      child[stream].on('data', (data) => {
        const available = maxBytes - count;
        if (available > 0) chunks[stream].push(data.subarray(0, available));
        count += Math.min(data.length, Math.max(available, 0));
        if (data.length > available) stop('OUTPUT_LIMIT');
      });
    }
    child.once('error', () => {
      terminal ??= 'SPAWN_ERROR';
      finish(null);
    });
    child.once('close', finish);
  });
}
export function summarizeRun(result) {
  return {
    status: result.status,
    exitCode: result.exitCode,
    stdoutBytes: Buffer.byteLength(result.stdout),
    stderrBytes: Buffer.byteLength(result.stderr),
  };
}
