import { BoundaryError, relativePath } from './files.mjs';

export const PROVIDER_VERSIONS = Object.freeze({
  rulesync: '43.6.0',
  vale: '3.26.0',
  rumdl: '0.3.2',
  gitleaks: '8.30.1',
});
/** Used only inside explicitly generated scratch fixtures until vault-export contracts are adopted. */
export function providerArgs(tool, file = 'docs/check.md') {
  const name = `./${relativePath(file)}`;
  switch (tool) {
    case 'rulesync':
      return [
        '--json',
        'generate',
        '--dry-run',
        '--targets',
        'claudecode,codexcli',
        '--features',
        'hooks',
      ];
    case 'vale':
      return ['--config=.vale.ini', '--output=JSON', name];
    case 'rumdl':
      return ['check', '--no-cache', '--config', '.rumdl.toml', '--output-format', 'json', name];
    case 'gitleaks':
      return [
        'dir',
        '--config=.gitleaks.toml',
        '--redact=100',
        '--no-banner',
        '--report-format=json',
        '--report-path=report.json',
        './docs',
      ];
    default:
      throw new BoundaryError('NMLB_PROVIDER');
  }
}
export function parseFindings(tool, result) {
  const error = { status: 'ERROR', findingCount: null };
  if (!['OK', 'EXIT_NONZERO'].includes(result.status) || ![0, 1].includes(result.exitCode))
    return error;
  try {
    const json = JSON.parse(result.stdout);
    let count;
    if (tool === 'vale') {
      if (
        !json ||
        Array.isArray(json) ||
        typeof json !== 'object' ||
        !Object.values(json).every(Array.isArray)
      )
        return error;
      count = Object.values(json).reduce((sum, rows) => sum + rows.length, 0);
    } else {
      if (!['rumdl', 'gitleaks'].includes(tool) || !Array.isArray(json)) return error;
      count = json.length;
    }
    if (!count && result.exitCode !== 0) return error;
    return { status: count ? 'FINDINGS' : 'CLEAN', findingCount: count };
  } catch {
    return error;
  }
}

/** Fixture contract for Rulesync 43.6.0; this validates a plan, not its unreported file contents. */
export function validateRulesyncPreview(text) {
  const object = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  try {
    const value = JSON.parse(text);
    if (
      !object(value) ||
      value.success !== true ||
      value.error !== undefined ||
      value.command !== 'generate' ||
      value.version !== PROVIDER_VERSIONS.rulesync ||
      !object(value.data?.features?.hooks) ||
      value.data?.plan?.version !== 2
    )
      throw new Error();
    const operations = value.data.plan.operations;
    if (!Array.isArray(operations) || operations.length < 2 || operations.length > 20)
      throw new Error();
    for (const op of operations) {
      if (
        !object(op) ||
        op.action !== 'write' ||
        !['file', 'key'].includes(op.kind) ||
        op.feature !== 'hooks' ||
        (op.kind === 'key' && typeof op.key !== 'string')
      )
        throw new Error();
      relativePath(op.path);
    }
    for (const target of ['.claude/settings.json', '.codex/hooks.json']) {
      if (!operations.some((op) => op.kind === 'file' && op.path === target)) throw new Error();
    }
    return { operations };
  } catch {
    throw new BoundaryError('NMLB_RULESYNC_PREVIEW');
  }
}

/** Run only on files generated inside a disposable fixture, never user settings. */
export function validateFixtureHooks(claude, codex) {
  const commands = (value) => {
    const groups = value?.hooks?.PreToolUse;
    if (!Array.isArray(groups)) throw new BoundaryError('NMLB_RULESYNC_CONTENT');
    return groups
      .flatMap((group) => {
        if (!Array.isArray(group?.hooks)) throw new BoundaryError('NMLB_RULESYNC_CONTENT');
        return group.hooks.map((hook) => {
          if (hook?.type !== 'command' || typeof hook.command !== 'string')
            throw new BoundaryError('NMLB_RULESYNC_CONTENT');
          return hook.command;
        });
      })
      .sort();
  };
  if (
    claude?.fixture !== 'KEEP_UNRELATED' ||
    JSON.stringify(commands(claude)) !==
      JSON.stringify(['echo KEEP', 'echo NMLB_MANAGED_FIXTURE']) ||
    JSON.stringify(commands(codex)) !== JSON.stringify(['echo NMLB_MANAGED_FIXTURE'])
  ) {
    throw new BoundaryError('NMLB_RULESYNC_CONTENT');
  }
}
