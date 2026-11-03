/** An existence probe only: no read, write, process or network capability. */
export interface VaultProbe {
  exists(path: string): Promise<boolean>;
}

export interface SurfaceStatus {
  id: string;
  name: string;
  owner: string;
  presence: 'PRESENT' | 'ABSENT' | 'ERROR';
  execution: 'NOT_RUN';
  paths: string[];
  code?: 'NMLB_PROBE_FAILED' | 'NMLB_SOURCE_AMBIGUOUS';
}

const SURFACES = [
  {
    id: 'authority',
    name: 'Autoridad del vault',
    owner: 'Responsable del vault',
    paths: ['AGENTS.md'],
  },
  {
    id: 'rulesync',
    name: 'Distribución de agentes',
    owner: 'Rulesync (candidato)',
    paths: ['rulesync.jsonc', '.rulesync/hooks.json', '.rulesync/hooks.jsonc'],
  },
  { id: 'vale', name: 'Estilo editorial', owner: 'Vale (candidato)', paths: ['.vale.ini'] },
  { id: 'rumdl', name: 'Sintaxis Markdown', owner: 'rumdl (candidato)', paths: ['.rumdl.toml'] },
  {
    id: 'precommit',
    name: 'Validación antes del commit',
    owner: 'Gestor Git del vault',
    paths: ['.pre-commit-config.yaml'],
  },
] as const;

/** Presence is evidence of a path, never of valid configuration or enforcement. */
export async function inspectVault(probe: VaultProbe): Promise<SurfaceStatus[]> {
  const results: SurfaceStatus[] = [];
  for (const surface of SURFACES) {
    const paths: string[] = [];
    let failed = false;
    for (const path of surface.paths) {
      try {
        if (await probe.exists(path)) paths.push(path);
      } catch {
        // Error messages can contain local paths, credentials or note contents.
        failed = true;
      }
    }
    const status: SurfaceStatus = {
      id: surface.id,
      name: surface.name,
      owner: surface.owner,
      presence: failed ? 'ERROR' : paths.length > 0 ? 'PRESENT' : 'ABSENT',
      execution: 'NOT_RUN',
      paths,
    };
    if (failed) status.code = 'NMLB_PROBE_FAILED';
    else if (paths.includes('.rulesync/hooks.json') && paths.includes('.rulesync/hooks.jsonc')) {
      status.code = 'NMLB_SOURCE_AMBIGUOUS';
    }
    results.push(status);
  }
  return results;
}
