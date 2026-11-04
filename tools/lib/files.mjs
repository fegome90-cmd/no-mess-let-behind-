import { constants } from 'node:fs';
import { lstat, open, realpath } from 'node:fs/promises';
import path from 'node:path';

export class BoundaryError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}
export function relativePath(value) {
  if (
    typeof value !== 'string' ||
    value.length > 1024 ||
    /^[A-Za-z]:/.test(value) ||
    value.includes('\\') ||
    [...value].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127) ||
    value.split('/').some((p) => !p || p === '.' || p === '..')
  ) {
    throw new BoundaryError('NMLB_PATH');
  }
  return value;
}
export async function canonicalRoot(root) {
  if (typeof root !== 'string' || !path.isAbsolute(root)) throw new BoundaryError('NMLB_ROOT');
  const stat = await lstat(root);
  if (stat.isSymbolicLink()) throw new BoundaryError('NMLB_SYMLINK');
  if (!stat.isDirectory()) throw new BoundaryError('NMLB_ROOT');
  return realpath(root);
}
/** Reject links at every existing segment; not a sandbox against hostile concurrent owners. */
export async function confinedPath(root, relative, allowMissing = false) {
  const parts = relativePath(relative).split('/');
  let target = await canonicalRoot(root);
  for (let i = 0; i < parts.length; i++) {
    target = path.join(target, parts[i]);
    let stat;
    try {
      stat = await lstat(target);
    } catch (error) {
      if (allowMissing && error.code === 'ENOENT') return path.join(target, ...parts.slice(i + 1));
      throw error;
    }
    if (stat.isSymbolicLink()) throw new BoundaryError('NMLB_SYMLINK');
    if (i < parts.length - 1 && !stat.isDirectory()) throw new BoundaryError('NMLB_NOT_DIRECTORY');
  }
  return target;
}
export async function readBounded(root, relative, maxBytes = 65_536) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 32 * 1024 * 1024) {
    throw new BoundaryError('NMLB_LIMIT');
  }
  const target = await confinedPath(root, relative);
  const before = await lstat(target);
  if (!before.isFile()) throw new BoundaryError('NMLB_NOT_FILE');
  if (before.nlink !== 1) throw new BoundaryError('NMLB_HARDLINK');
  if (before.size > maxBytes) throw new BoundaryError('NMLB_TOO_LARGE');
  const handle = await open(target, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const opened = await handle.stat();
    if (!opened.isFile() || opened.dev !== before.dev || opened.ino !== before.ino) {
      throw new BoundaryError('NMLB_CHANGED');
    }
    const buffer = Buffer.alloc(maxBytes + 1);
    let count = 0;
    while (count < buffer.length) {
      const { bytesRead } = await handle.read(buffer, count, buffer.length - count, null);
      if (!bytesRead) break;
      count += bytesRead;
    }
    if (count > maxBytes) throw new BoundaryError('NMLB_TOO_LARGE');
    const after = await handle.stat();
    if (after.size !== count || after.mtimeMs !== opened.mtimeMs)
      throw new BoundaryError('NMLB_CHANGED');
    return buffer.subarray(0, count);
  } finally {
    await handle.close();
  }
}
export function errorCode(error) {
  return error instanceof BoundaryError ? error.code : 'NMLB_IO';
}
export async function readJson(root, relative, maxBytes) {
  let bytes;
  try {
    bytes = await readBounded(root, relative, maxBytes);
  } catch (error) {
    return error.code === 'ENOENT'
      ? { state: 'ABSENT' }
      : { state: 'ERROR', code: errorCode(error) };
  }
  try {
    return {
      state: 'READ',
      value: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)),
    };
  } catch {
    return { state: 'ERROR', code: 'NMLB_JSON' };
  }
}
