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
      return ['check', '--config', '.rumdl.toml', '--output-format', 'json', name];
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
