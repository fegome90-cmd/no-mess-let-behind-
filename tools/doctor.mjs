import path from 'node:path';
import { parseArgs } from 'node:util';
import { inspectClaudian } from './lib/doctor.mjs';
import { errorCode } from './lib/files.mjs';

try {
  const { values } = parseArgs({
    options: { vault: { type: 'string' }, 'config-dir': { type: 'string' } },
  });
  if (!values.vault) throw new Error('vault required');
  const result = await inspectClaudian(path.resolve(values.vault), values['config-dir']);
  console.log(JSON.stringify(result, null, 2));
  if (['INVALID', 'ERROR'].includes(result.metadata) || result.enabled === 'ERROR')
    process.exitCode = 2;
} catch (error) {
  console.error(JSON.stringify({ status: 'ERROR', code: errorCode(error) }));
  process.exitCode = 2;
}
