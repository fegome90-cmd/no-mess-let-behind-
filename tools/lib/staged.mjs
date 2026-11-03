import { createHash } from 'node:crypto';
import path from 'node:path';
import { BoundaryError, canonicalRoot, relativePath } from './files.mjs';
import { runBounded } from './runner.mjs';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
/** Inspect the Git index; PASS here means scope-only, never editorial/security approval. */
export async function inspectIndex(
  root,
  { git = '/usr/bin/git', protectedPaths = [], maxBlobBytes = 1_048_576 } = {},
) {
  const cwd = await canonicalRoot(root);
  for (const prefix of protectedPaths) relativePath(prefix);
  if (!Number.isSafeInteger(maxBlobBytes) || maxBlobBytes < 1 || maxBlobBytes > 8_388_608)
    throw new BoundaryError('NMLB_LIMIT');
  const invoke = async (args, maxBytes = 4_194_304) => {
    const result = await runBounded({
      executable: git,
      cwd,
      maxBytes,
      args: [
        '--no-optional-locks',
        '--no-pager',
        '-c',
        'core.fsmonitor=false',
        '-c',
        'core.hooksPath=/dev/null',
        ...args,
      ],
    });
    if (result.status !== 'OK') throw new BoundaryError(`NMLB_GIT_${result.status}`);
    return result.stdout;
  };
  const top = (await invoke(['rev-parse', '--show-toplevel'])).trim();
  if (path.resolve(top) !== cwd) throw new BoundaryError('NMLB_GIT_ROOT');
  const before = await invoke(['ls-files', '--stage', '-z']);
  const raw = await invoke([
    'diff',
    '--cached',
    '--raw',
    '-z',
    '--no-abbrev',
    '--find-renames=50%',
    '--no-ext-diff',
    '--no-textconv',
  ]);
  const tokens = raw.split('\0');
  if (tokens.pop() !== '') throw new BoundaryError('NMLB_GIT_PROTOCOL');
  const changes = [];
  const findings = [];
  for (let i = 0; i < tokens.length; ) {
    if (changes.length >= 1000) throw new BoundaryError('NMLB_TOO_MANY_FILES');
    const header = /^:([0-7]{6}) ([0-7]{6}) ([a-f0-9]{40,64}) ([a-f0-9]{40,64}) ([A-Z])\d*$/.exec(
      tokens[i++],
    );
    if (!header || i >= tokens.length) throw new BoundaryError('NMLB_GIT_PROTOCOL');
    const [, , mode, , blob, status] = header;
    let name = tokens[i++];
    let fromPath;
    if (status === 'R' || status === 'C') {
      fromPath = name;
      name = tokens[i++];
    }
    try {
      relativePath(name);
      if (fromPath) relativePath(fromPath);
      if (`${name}${fromPath ?? ''}`.includes('\uFFFD')) throw new BoundaryError('NMLB_PATH');
    } catch {
      throw new BoundaryError('NMLB_INDEX_PATH');
    }
    const row = { status, path: name, ...(fromPath ? { fromPath } : {}), blob };
    for (const candidate of [name, fromPath].filter(Boolean)) {
      if (
        protectedPaths.some((prefix) => candidate === prefix || candidate.startsWith(`${prefix}/`))
      ) {
        findings.push({ code: 'NMLB_PROTECTED', path: candidate });
      }
    }
    if (!['A', 'C', 'D', 'M', 'R', 'T'].includes(status))
      findings.push({ code: 'NMLB_INDEX_STATE', path: name });
    if (status !== 'D' && !['100644', '100755'].includes(mode)) {
      findings.push({ code: 'NMLB_INDEX_MODE', path: name });
    } else if (status !== 'D' && name.toLowerCase().endsWith('.md')) {
      const sizeText = (await invoke(['cat-file', '-s', blob], 128)).trim();
      if (!/^\d+$/.test(sizeText)) throw new BoundaryError('NMLB_GIT_PROTOCOL');
      const size = Number(sizeText);
      row.bytes = size;
      if (size > maxBlobBytes) findings.push({ code: 'NMLB_TOO_LARGE', path: name });
      else {
        const text = await invoke(['cat-file', 'blob', blob], maxBlobBytes + 1);
        if (text.includes('\0') || text.includes('\uFFFD'))
          findings.push({ code: 'NMLB_BINARY', path: name });
        else row.contentHash = sha256(text);
      }
    }
    changes.push(row);
  }
  const after = await invoke(['ls-files', '--stage', '-z']);
  if (after !== before) throw new BoundaryError('NMLB_INDEX_CHANGED');
  return {
    schema: 'nmlb-staged/1',
    scopeStatus: findings.length ? 'FAIL' : 'PASS',
    quality: 'NOT_RUN',
    secrets: 'NOT_RUN',
    indexHash: sha256(before),
    changes,
    findings,
  };
}
