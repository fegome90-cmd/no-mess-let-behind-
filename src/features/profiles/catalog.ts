export interface ProfileMetadata {
  readonly id: string;
  readonly label: string;
  readonly sourceRepository: string;
  readonly sourceCommit: string;
  readonly license: string;
  readonly compatibleHosts: readonly string[];
  readonly potentialPaths: readonly string[];
  readonly classification: 'fixture-only' | 'candidate';
}
// Metadata of reviewed synthetic profiles only; no policy is embedded or activated.
const source = {
  sourceRepository: 'fegome90-cmd/no-mess-let-behind-',
  sourceCommit: '382587d038124a26a202de4190a086cb95ad7082',
  license: 'MIT',
  classification: 'fixture-only' as const,
};
const catalog: readonly ProfileMetadata[] = Object.freeze([
  Object.freeze({
    ...source,
    id: 'fixture-editorial',
    label: 'Ejemplo editorial y Markdown',
    compatibleHosts: Object.freeze(['Vale CLI', 'rumdl CLI']),
    potentialPaths: Object.freeze(['.vale.ini', '.rumdl.toml', 'styles/NMLB/']),
  }),
  Object.freeze({
    ...source,
    id: 'fixture-rulesync',
    label: 'Ejemplo de distribución de reglas',
    compatibleHosts: Object.freeze(['Rulesync CLI']),
    potentialPaths: Object.freeze(['rulesync.jsonc', '.rulesync/hooks.jsonc']),
  }),
  Object.freeze({
    ...source,
    id: 'fixture-git',
    label: 'Ejemplo de alcance Git',
    compatibleHosts: Object.freeze(['Git CLI']),
    potentialPaths: Object.freeze(['.pre-commit-config.yaml']),
  }),
  Object.freeze({
    ...source,
    id: 'fixture-secrets',
    label: 'Marcador sintético de secretos',
    compatibleHosts: Object.freeze(['Gitleaks CLI']),
    potentialPaths: Object.freeze(['.gitleaks.toml']),
  }),
]);
export function listProfileMetadata(): readonly ProfileMetadata[] {
  return catalog;
}
