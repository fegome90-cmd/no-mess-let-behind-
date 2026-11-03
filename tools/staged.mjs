import path from 'node:path';
import { parseArgs } from 'node:util';
import { errorCode } from './lib/files.mjs';
import { inspectIndex } from './lib/staged.mjs';

try {
  const { values } = parseArgs({
    options: {
      vault: { type: 'string' },
      git: { type: 'string' },
      protect: { type: 'string', multiple: true },
    },
  });
  if (!values.vault) throw new Error('vault required');
  const report = await inspectIndex(path.resolve(values.vault), {
    git: values.git,
    protectedPaths: values.protect ?? [],
  });
  console.log(JSON.stringify(report, null, 2));
  if (report.scopeStatus !== 'PASS') process.exitCode = 1;
} catch (error) {
  console.error(JSON.stringify({ scopeStatus: 'ERROR', code: errorCode(error) }));
  process.exitCode = 2;
}
