import { canonicalRoot, readJson, relativePath } from './files.mjs';

const ROUTES = [
  ['terminal', 'claude', 'cli'],
  ['claudian', 'claude', 'sdk'],
  ['terminal', 'codex', 'cli'],
  ['claudian', 'codex', 'app-server'],
  ['terminal', 'pi', 'cli'],
  ['claudian', 'pi', 'rpc'],
];
/** Static metadata only. Never reads conversations, plugin data.json or agent secrets. */
export async function inspectClaudian(root, configDir = '.obsidian') {
  relativePath(configDir);
  await canonicalRoot(root);
  const manifest = await readJson(root, `${configDir}/plugins/realclaudian/manifest.json`);
  const community = await readJson(root, `${configDir}/community-plugins.json`, 32_768);
  const valid =
    manifest.state === 'READ' &&
    manifest.value?.id === 'realclaudian' &&
    typeof manifest.value.version === 'string' &&
    /^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/.test(manifest.value.version);
  const configured =
    community.state === 'READ' &&
    Array.isArray(community.value) &&
    community.value.every((v) => typeof v === 'string');
  return {
    schema: 'nmlb-doctor/1',
    metadata: manifest.state === 'READ' ? (valid ? 'VALID' : 'INVALID') : manifest.state,
    ...(valid ? { version: manifest.value.version } : {}),
    ...(manifest.code ? { code: manifest.code } : {}),
    enabled: configured
      ? community.value.includes('realclaudian')
        ? 'CONFIGURED'
        : 'NOT_CONFIGURED'
      : community.state === 'ABSENT'
        ? 'UNKNOWN'
        : 'ERROR',
    loaded: 'UNKNOWN',
    routes: ROUTES.map(([host, provider, transport]) => ({
      host,
      provider,
      transport,
      execution: 'NOT_RUN',
      trust: 'UNKNOWN',
    })),
  };
}
