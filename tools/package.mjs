import path from 'node:path';
import { parseArgs } from 'node:util';
import { errorCode } from './lib/files.mjs';
import { packageBuild } from './lib/install.mjs';

try {
  const { values } = parseArgs({ options: { build: { type: 'string' }, out: { type: 'string' } } });
  if (!values.build || !values.out) throw new Error('arguments');
  console.log(
    JSON.stringify(
      await packageBuild(path.resolve(values.build), path.resolve(values.out)),
      null,
      2,
    ),
  );
} catch (error) {
  console.error(JSON.stringify({ status: 'ERROR', code: errorCode(error) }));
  process.exitCode = 2;
}
